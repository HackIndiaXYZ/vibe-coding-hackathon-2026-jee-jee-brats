"""
Pydantic v2 schemas for LoadKaro Advanced Features.
Covers auction, clustering, and volume estimation endpoints.
"""
from __future__ import annotations

from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Auction Schemas ──────────────────────────────────────────────────────────

class CreateAuctionRequest(BaseModel):
    """Request body for creating a new auction."""
    load_id: str = Field(..., description="Unique load identifier")
    initial_bid: float = Field(..., gt=0, description="Customer's asking price")
    zone_hash: str = Field(..., description="Geohash of the zone")
    start_latitude: float = Field(..., ge=-90.0, le=90.0)
    start_longitude: float = Field(..., ge=-180.0, le=180.0)
    end_latitude: float = Field(..., ge=-90.0, le=90.0)
    end_longitude: float = Field(..., ge=-180.0, le=180.0)
    required_volume: float = Field(..., gt=0, description="Required vehicle volume in m³")


class AuctionStateResponse(BaseModel):
    """Current auction state."""
    load_id: str
    min_bid: float
    current_winner: Optional[str] = None
    status: str
    created_at: float
    expires_at: float
    time_remaining_seconds: int = 0


class AuctionCreatedResponse(BaseModel):
    """Response after auction creation."""
    auction_id: str
    initial_bid: float
    expires_at: float
    zone_hash: str
    status: str


class BidDTO(BaseModel):
    """A single bid entry."""
    driver_id: str
    amount: float
    timestamp: float
    vehicle_id: str


class BidHistoryResponse(BaseModel):
    """Complete bid history for an auction."""
    load_id: str
    bids: List[BidDTO]


# ── Clustering Schemas ───────────────────────────────────────────────────────

class LoadInput(BaseModel):
    """A single load for clustering."""
    load_id: str
    pickup_latitude: float = Field(..., ge=-90.0, le=90.0)
    pickup_longitude: float = Field(..., ge=-180.0, le=180.0)
    dropoff_latitude: float = Field(..., ge=-90.0, le=90.0)
    dropoff_longitude: float = Field(..., ge=-180.0, le=180.0)
    required_volume: float = Field(..., gt=0)
    priority: bool = False
    bid_amount: float = Field(0, ge=0)


class PoolLoadsRequest(BaseModel):
    """Request body for load clustering."""
    loads: List[LoadInput]
    vehicle_class: str = Field("tata_ace", description="Vehicle class: 2_wheeler, 3_wheeler, tata_ace, truck")


class PoolMetrics(BaseModel):
    """Pooling efficiency metrics."""
    num_clusters: int
    total_volume: float
    max_capacity: float
    utilization_percentage: float
    total_revenue: float
    avg_bids_per_pool: float


class PoolLoadsResponse(BaseModel):
    """Clustering result with metrics."""
    clusters: List[List[str]]
    metrics: PoolMetrics


# ── Volume Estimation Schemas ────────────────────────────────────────────────

class BoundingBoxDTO(BaseModel):
    """Bounding box of detected object."""
    x: int
    y: int
    width: int
    height: int


class VolumeEstimateResponse(BaseModel):
    """Volume estimation result from image."""
    estimated_volume_m3: float
    classification: str
    confidence: float
    bounding_box: BoundingBoxDTO
    vehicle_fit: Dict[str, bool]
    recommended_vehicle: str
    detailed_measurements: Dict = {}


class ValidateLoadRequest(BaseModel):
    """Request to validate load fit."""
    image_base64: str = Field(..., description="Base64 encoded image of cargo")
    max_allowed_volume: float = Field(5.0, gt=0, description="Max allowed volume in m³")


class ValidateLoadResponse(BaseModel):
    """Load validation result."""
    fits: bool
    estimated_volume: float
    max_allowed: float
    confidence: float


# ── Helper Schemas ───────────────────────────────────────────────────────────

class BookHelperRequest(BaseModel):
    """Request body for booking helpers."""
    load_id: str = Field(..., description="Unique load identifier")
    num_helpers: int = Field(..., ge=1, le=2, description="Number of helpers (1 or 2)")

class BookHelperResponse(BaseModel):
    """Response after booking helpers."""
    load_id: str
    num_helpers: int
    helper_fee: float
    total_fee_added: float
    status: str
    message: str


# ── Webhook Schemas ──────────────────────────────────────────────────────────

class WhatsAppWebhookResponse(BaseModel):
    """Response for WhatsApp webhook processing."""
    success: bool
    message: str
    load_id: Optional[str] = None
    extracted_pickup: Optional[str] = None
    extracted_dropoff: Optional[str] = None
