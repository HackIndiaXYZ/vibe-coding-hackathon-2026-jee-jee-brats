"""
FastAPI Router for Advanced LoadKaro Features.
Wires auction WebSockets, load clustering, and volume validation
into the main application.
"""
import base64
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, WebSocket, HTTPException, status, UploadFile, File, Form

from .auction import ConnectionManager, AuctionEngine, auction_websocket_handler, auction_ttl_monitor
from .clustering import cluster_loads, VEHICLE_LIMITS
from .volume import validate_load_volume
from .schemas import (
    CreateAuctionRequest,
    AuctionStateResponse,
    AuctionCreatedResponse,
    BidDTO,
    BidHistoryResponse,
    PoolLoadsRequest,
    PoolLoadsResponse,
    PoolMetrics,
    VolumeEstimateResponse,
    ValidateLoadRequest,
    ValidateLoadResponse,
)

logger = logging.getLogger(__name__)

# Router — mounted at /api/v1/advanced by the main app
router = APIRouter(prefix="/api/v1/advanced", tags=["Advanced Features"])

# Global instances — initialised via init_advanced_features()
connection_manager: Optional[ConnectionManager] = None
auction_engine: Optional[AuctionEngine] = None


# ── Lifecycle helpers ────────────────────────────────────────────────────────

async def init_advanced_features(redis_url: str = "redis://localhost"):
    """
    Initialise Redis-backed auction subsystem.
    Call during FastAPI startup event.
    Clustering and volume estimation work without Redis.
    """
    global connection_manager, auction_engine

    connection_manager = ConnectionManager(redis_url=redis_url)
    try:
        await connection_manager.init_redis()
        auction_engine = AuctionEngine(connection_manager.redis)
        logger.info("Advanced features initialised (auction engine ready)")
    except Exception as e:
        logger.warning(
            f"Redis unavailable ({e}). Auction endpoints will return 503. "
            "Clustering and volume estimation remain available."
        )
        connection_manager = None
        auction_engine = None


async def shutdown_advanced_features():
    """Gracefully close Redis connections on shutdown."""
    global connection_manager
    if connection_manager:
        await connection_manager.close()
        logger.info("Advanced features shut down")


def _require_auction():
    """Raise 503 if auction subsystem is not available."""
    if not connection_manager or not auction_engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auction service unavailable — Redis is not connected",
        )


# ── Auction Endpoints ────────────────────────────────────────────────────────

@router.websocket("/ws/auction/{load_id}")
async def websocket_auction(
    websocket: WebSocket,
    load_id: str,
    driver_id: str,
    vehicle_id: str,
):
    """
    WebSocket endpoint for real-time auction bidding.

    Query Parameters:
    - driver_id: UUID of the bidding driver
    - vehicle_id: UUID of the driver's vehicle

    Client → Server message:
    ```json
    {"event": "place_bid", "bid_amount": 450.50}
    ```
    """
    if not connection_manager or not auction_engine:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    await auction_websocket_handler(
        websocket=websocket,
        load_id=load_id,
        driver_id=driver_id,
        vehicle_id=vehicle_id,
        connection_manager=connection_manager,
        auction_engine=auction_engine,
    )


@router.post(
    "/auction/create",
    response_model=AuctionCreatedResponse,
    summary="Create a new auction for a load",
    responses={503: {"description": "Auction service unavailable"}},
)
async def create_auction(request: CreateAuctionRequest):
    """Create a 3-minute reverse auction for a load request."""
    _require_auction()

    try:
        auction = await auction_engine.create_auction(
            load_id=request.load_id,
            initial_bid=request.initial_bid,
            zone_hash=request.zone_hash,
            start_location={"lat": request.start_latitude, "lon": request.start_longitude},
            end_location={"lat": request.end_latitude, "lon": request.end_longitude},
            required_volume=request.required_volume,
        )

        return AuctionCreatedResponse(
            auction_id=auction.load_id,
            initial_bid=auction.min_bid,
            expires_at=auction.expires_at,
            zone_hash=auction.zone_hash,
            status=auction.status,
        )

    except Exception as e:
        logger.error(f"Error creating auction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/auction/{load_id}",
    response_model=AuctionStateResponse,
    summary="Get current auction state",
    responses={
        404: {"description": "Auction not found"},
        503: {"description": "Auction service unavailable"},
    },
)
async def get_auction_state(load_id: str):
    """Retrieve the current state of an auction including time remaining."""
    _require_auction()

    auction = await auction_engine.get_auction(load_id)
    if not auction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Auction not found or expired",
        )

    now = datetime.utcnow().timestamp()
    time_remaining = max(0, int(auction.expires_at - now))

    return AuctionStateResponse(
        load_id=auction.load_id,
        min_bid=auction.min_bid,
        current_winner=auction.current_winner,
        status=auction.status,
        created_at=auction.created_at,
        expires_at=auction.expires_at,
        time_remaining_seconds=time_remaining,
    )


@router.get(
    "/auction/{load_id}/history",
    response_model=BidHistoryResponse,
    summary="Retrieve bid history for an auction",
    responses={503: {"description": "Auction service unavailable"}},
)
async def get_bid_history(load_id: str):
    """Get the full ordered list of bids placed on an auction."""
    _require_auction()

    bids = await auction_engine.get_bid_history(load_id)

    return BidHistoryResponse(
        load_id=load_id,
        bids=[
            BidDTO(
                driver_id=bid.driver_id,
                amount=bid.amount,
                timestamp=bid.timestamp,
                vehicle_id=bid.vehicle_id,
            )
            for bid in bids
        ],
    )


# ── Clustering Endpoints ─────────────────────────────────────────────────────

@router.post(
    "/clustering/pool-loads",
    response_model=PoolLoadsResponse,
    summary="Cluster loads into optimal pools",
)
async def pool_loads(request: PoolLoadsRequest):
    """
    Group nearby loads with compatible trajectories and volumes
    into clusters that fit within a single vehicle's capacity.
    Uses DBSCAN + volume-constrained bin-packing.
    """
    try:
        # Convert Pydantic models to dicts for the clustering engine
        loads_dicts = [load.model_dump() for load in request.loads]
        vehicle_class = request.vehicle_class

        clusters = cluster_loads(loads_dicts, vehicle_class=vehicle_class)

        # Calculate metrics
        total_volume = sum(l.required_volume for l in request.loads)
        total_bids = sum(l.bid_amount for l in request.loads)
        vehicle_cap = VEHICLE_LIMITS.get(vehicle_class, VEHICLE_LIMITS["tata_ace"])
        num_clusters = len(clusters) if clusters else 1

        metrics = PoolMetrics(
            num_clusters=len(clusters),
            total_volume=round(total_volume, 2),
            max_capacity=round(num_clusters * vehicle_cap, 2),
            utilization_percentage=round(
                (total_volume / (num_clusters * vehicle_cap)) * 100, 1
            ) if clusters else 0,
            total_revenue=round(total_bids, 2),
            avg_bids_per_pool=round(total_bids / num_clusters, 2) if clusters else 0,
        )

        return PoolLoadsResponse(clusters=clusters, metrics=metrics)

    except Exception as e:
        logger.error(f"Error clustering loads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ── Volume Estimation Endpoints ──────────────────────────────────────────────

@router.post(
    "/ai/estimate-volume",
    response_model=VolumeEstimateResponse,
    summary="Estimate cargo volume from image",
)
async def estimate_cargo_volume(
    image: UploadFile = File(..., description="Image file (PNG, JPG)"),
    reference_height_cm: float = Form(150.0, description="Reference object height in cm"),
):
    """
    Upload a cargo image and receive a volume estimate, vehicle classification,
    and confidence score using computer-vision contour analysis.
    """
    try:
        contents = await image.read()
        image_base64 = base64.b64encode(contents).decode("utf-8")

        result = validate_load_volume(image_base64, reference_height_cm)

        return VolumeEstimateResponse(**result)

    except Exception as e:
        logger.error(f"Error estimating volume: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/ai/validate-load",
    response_model=ValidateLoadResponse,
    summary="Validate if load fits a vehicle",
)
async def validate_load(request: ValidateLoadRequest):
    """
    Check whether a cargo load (captured as a base64 image) can physically
    fit inside a vehicle with the given max_allowed_volume.
    """
    try:
        result = validate_load_volume(request.image_base64)

        fits = result["estimated_volume_m3"] <= request.max_allowed_volume

        return ValidateLoadResponse(
            fits=fits,
            estimated_volume=result["estimated_volume_m3"],
            max_allowed=request.max_allowed_volume,
            recommendation=result["recommended_vehicle"],
            confidence=result["confidence"],
        )

    except Exception as e:
        logger.error(f"Error validating load: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
