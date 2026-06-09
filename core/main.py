"""
LoadKaro FastAPI Application - Core Infrastructure
High-performance Python architecture with geospatial database for hyper-local driver matching.
"""
import logging
from contextlib import asynccontextmanager
from typing import List
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_session
from .schemas import (
    NearbyDriversResponse,
    DriverDTO,
    CargoLaneMatchRequest,
    CargoLaneMatchResponse,
    B2BBookRequest,
    B2BBookResponse,
    ErrorResponse,
)
from .models import UserRole
from . import crud

# Advanced features
from features.routes import router as advanced_router
from features.routes import init_advanced_features, shutdown_advanced_features
from features.helpers import router as helpers_router
from features.webhooks import router as webhooks_router
from features.auth import router as auth_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle for the application."""
    # Startup — initialise advanced features (auction/Redis)
    logger.info("Starting LoadKaro API...")
    await init_advanced_features(redis_url=settings.redis_url)
    yield
    # Shutdown — close Redis connections
    logger.info("Shutting down LoadKaro API...")
    await shutdown_advanced_features()


# Initialize FastAPI app
app = FastAPI(
    title="LoadKaro API",
    description="Hyper-local freight matching with geospatial database",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Include auth and advanced features routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(advanced_router)

# Include helper and webhook routers
app.include_router(helpers_router, prefix="/api/v1/helpers", tags=["Helpers"])
app.include_router(webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
@app.get(
    "/api/v1/health",
    tags=["Health"],
    summary="Health check endpoint",
)
async def health_check():
    """System health status endpoint."""
    return {
        "status": "healthy",
        "service": "LoadKaro API",
    }


@app.get(
    "/api/v1/drivers/nearby",
    response_model=NearbyDriversResponse,
    tags=["Drivers"],
    summary="Find nearby active drivers",
    responses={
        200: {"description": "List of nearby drivers"},
        400: {"model": ErrorResponse, "description": "Invalid parameters"},
    },
)
async def get_nearby_drivers(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    session: AsyncSession = Depends(get_session),
) -> NearbyDriversResponse:
    """
    Find active drivers within specified radius using PostGIS ST_DWithin.
    
    Query Parameters:
    - latitude: Customer/load location latitude (-90 to 90)
    - longitude: Customer/load location longitude (-180 to 180)
    - radius_km: Search radius in kilometers (default 5km)
    
    Returns:
    - List of driver DTOs with ID, name, email, role, and active status
    """
    # Validate coordinates
    if not (-90 <= latitude <= 90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude must be between -90 and 90",
        )
    if not (-180 <= longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude must be between -180 and 180",
        )
    if radius_km <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Radius must be positive",
        )
    
    # Execute geospatial query
    drivers = await crud.get_nearby_drivers(
        session=session,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )
    
    # Transform to DTOs
    driver_dtos = [
        DriverDTO(
            id=driver.id,
            name=driver.name,
            email=driver.email,
            role=driver.role,
            is_active=driver.is_active,
        )
        for driver in drivers
    ]
    
    return NearbyDriversResponse(drivers=driver_dtos)


@app.post(
    "/api/v1/cargo-lanes/match",
    response_model=CargoLaneMatchResponse,
    tags=["CargoLanes"],
    summary="Match pickup/dropoff to cargo lane",
    responses={
        200: {"description": "Cargo lane match result"},
        400: {"model": ErrorResponse, "description": "Invalid parameters"},
    },
)
async def match_cargo_lane(
    request: CargoLaneMatchRequest,
    session: AsyncSession = Depends(get_session),
) -> CargoLaneMatchResponse:
    """
    Check if pickup and dropoff coordinates match a pre-defined CargoLane.
    Uses PostGIS ST_Contains to verify if points fall within zone polygons.
    Returns fixed pricing if match found, bypassing auction system.
    
    Request body:
    - pickup_latitude: Pickup location latitude
    - pickup_longitude: Pickup location longitude
    - dropoff_latitude: Dropoff location latitude
    - dropoff_longitude: Dropoff location longitude
    
    Returns:
    - fixed_price: Price for this lane if matched, null otherwise
    - cargo_lane_id: ID of matched cargo lane, null if no match
    """
    # Execute cargo lane matching
    match_result = await crud.match_cargo_lane(
        session=session,
        pickup_lat=request.pickup_latitude,
        pickup_lon=request.pickup_longitude,
        dropoff_lat=request.dropoff_latitude,
        dropoff_lon=request.dropoff_longitude,
    )
    
    if match_result:
        cargo_lane_id, fixed_price = match_result
        return CargoLaneMatchResponse(
            fixed_price=fixed_price,
            cargo_lane_id=cargo_lane_id,
        )
    
    return CargoLaneMatchResponse(
        fixed_price=None,
        cargo_lane_id=None,
    )


@app.post(
    "/api/v1/b2b/book",
    response_model=B2BBookResponse,
    tags=["B2B"],
    summary="Book freight request with subscription quota",
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Load request created successfully"},
        400: {"model": ErrorResponse, "description": "Invalid parameters"},
        403: {"model": ErrorResponse, "description": "Insufficient quota"},
        404: {"model": ErrorResponse, "description": "User or subscription not found"},
    },
)
async def b2b_book(
    request: B2BBookRequest,
    session: AsyncSession = Depends(get_session),
) -> B2BBookResponse:
    """
    Book a freight request as B2B partner with subscription quota management.
    Atomically decrements monthly_quota and creates LoadRequest with priority flag.
    
    Request body:
    - b2b_user_id: B2B partner user ID
    - pickup_latitude: Pickup location latitude
    - pickup_longitude: Pickup location longitude
    - dropoff_latitude: Dropoff location latitude
    - dropoff_longitude: Dropoff location longitude
    - required_volume: Volume required in cubic units
    - priority: Priority flag for request (default true)
    
    Returns:
    - load_request_id: ID of created LoadRequest
    - status: Current status (pending)
    - priority: Priority flag
    - required_volume: Required volume
    
    Raises:
    - 404: User or subscription not found
    - 403: Insufficient quota available
    """
    # Verify user exists and is B2B partner
    user = await crud.get_user_by_id(session=session, user_id=request.b2b_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if user.role != UserRole.b2b_partner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a B2B partner",
        )
    
    # Check subscription exists
    subscription = await crud.get_subscription(session=session, b2b_user_id=request.b2b_user_id)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found for user",
        )
    
    # Atomically check and decrement quota
    quota_available = await crud.check_and_decrement_quota(
        session=session,
        b2b_user_id=request.b2b_user_id,
        quantity=1,
    )
    if not quota_available:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient quota. Monthly quota: {subscription.monthly_quota}, "
                   f"Used: {subscription.used_quota}",
        )
    
    # Create LoadRequest with priority flag
    load_request = await crud.create_load_request(
        session=session,
        customer_id=request.b2b_user_id,
        pickup_lat=request.pickup_latitude,
        pickup_lon=request.pickup_longitude,
        dropoff_lat=request.dropoff_latitude,
        dropoff_lon=request.dropoff_longitude,
        required_volume=request.required_volume,
        priority=request.priority,
    )
    
    return B2BBookResponse(
        load_request_id=load_request.id,
        status=load_request.status,
        priority=load_request.priority,
        required_volume=float(load_request.required_volume),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error_type": exc.__class__.__name__,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
