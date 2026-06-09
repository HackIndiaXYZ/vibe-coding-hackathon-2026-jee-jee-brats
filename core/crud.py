"""
CRUD operations for LoadKaro with PostGIS geospatial queries.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2 import Geometry
from geoalchemy2.functions import ST_DWithin, ST_Contains, ST_GeomFromText

from .models import User, UserRole, LoadRequest, CargoLane, Subscription, Vehicle, LoadRequestStatus


async def get_nearby_drivers(
    session: AsyncSession,
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
) -> List[User]:
    """
    Find active drivers within a specified radius using ST_DWithin PostGIS function.
    
    Args:
        session: AsyncSession for database operations
        latitude: Customer latitude
        longitude: Customer longitude
        radius_km: Search radius in kilometers (default 5km)
    
    Returns:
        List of nearby active drivers
    """
    # Create POINT geometry from latitude/longitude (WGS84/SRID 4326)
    point_geom = ST_GeomFromText(f"POINT({longitude} {latitude})", 4326)
    
    # ST_DWithin checks if distance is within radius (converted to meters)
    # Distance is in the same units as the geometry's SRID projection
    # For SRID 4326 (degrees), we approximate: 1 degree ≈ 111 km at equator
    radius_degrees = radius_km / 111.0
    
    query = select(User).where(
        and_(
            User.role == UserRole.driver,
            User.is_active == True,
            User.current_location.isnot(None),
            ST_DWithin(
                User.current_location,
                point_geom,
                radius_degrees,
            ),
        )
    )
    
    result = await session.execute(query)
    return result.scalars().all()


async def match_cargo_lane(
    session: AsyncSession,
    pickup_lat: float,
    pickup_lon: float,
    dropoff_lat: float,
    dropoff_lon: float,
) -> Optional[tuple[UUID, float]]:
    """
    Check if pickup and dropoff coordinates match any active CargoLane polygon.
    Uses ST_Contains to verify if points fall within zone polygons.
    
    Args:
        session: AsyncSession for database operations
        pickup_lat: Pickup latitude
        pickup_lon: Pickup longitude
        dropoff_lat: Dropoff latitude
        dropoff_lon: Dropoff longitude
    
    Returns:
        Tuple of (cargo_lane_id, fixed_price) if match found, else None
    """
    pickup_point = ST_GeomFromText(f"POINT({pickup_lon} {pickup_lat})", 4326)
    dropoff_point = ST_GeomFromText(f"POINT({dropoff_lon} {dropoff_lat})", 4326)
    
    # Find CargoLane where pickup is in start_zone and dropoff is in end_zone
    query = select(CargoLane.id, CargoLane.fixed_price).where(
        and_(
            CargoLane.is_active == True,
            ST_Contains(CargoLane.start_zone_geom, pickup_point),
            ST_Contains(CargoLane.end_zone_geom, dropoff_point),
        )
    )
    
    result = await session.execute(query)
    row = result.first()
    
    if row:
        return (row[0], float(row[1]))
    return None


async def check_and_decrement_quota(
    session: AsyncSession,
    b2b_user_id: UUID,
    quantity: int = 1,
) -> bool:
    """
    Atomically check subscription quota and decrement used_quota.
    
    Args:
        session: AsyncSession for database operations
        b2b_user_id: B2B partner user ID
        quantity: Number of units to decrement (default 1)
    
    Returns:
        True if quota available and decremented successfully, False otherwise
    """
    # Get subscription
    query = select(Subscription).where(
        Subscription.b2b_user_id == b2b_user_id
    )
    result = await session.execute(query)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        return False
    
    # Check if quota available
    available = subscription.monthly_quota - subscription.used_quota
    if available < quantity:
        return False
    
    # Atomically increment used_quota
    subscription.used_quota += quantity
    await session.commit()
    return True


async def create_load_request(
    session: AsyncSession,
    customer_id: UUID,
    pickup_lat: float,
    pickup_lon: float,
    dropoff_lat: float,
    dropoff_lon: float,
    required_volume: float,
    priority: bool = False,
) -> LoadRequest:
    """
    Create a new LoadRequest with geolocation data.
    
    Args:
        session: AsyncSession for database operations
        customer_id: ID of requesting customer/B2B user
        pickup_lat: Pickup latitude
        pickup_lon: Pickup longitude
        dropoff_lat: Dropoff latitude
        dropoff_lon: Dropoff longitude
        required_volume: Volume required in cubic units
        priority: Priority flag for B2B requests
    
    Returns:
        Created LoadRequest instance
    """
    pickup_point = f"SRID=4326;POINT({pickup_lon} {pickup_lat})"
    dropoff_point = f"SRID=4326;POINT({dropoff_lon} {dropoff_lat})"
    
    load_request = LoadRequest(
        customer_id=customer_id,
        pickup_geom=pickup_point,
        dropoff_geom=dropoff_point,
        required_volume=required_volume,
        priority=priority,
        status=LoadRequestStatus.pending,
    )
    
    session.add(load_request)
    await session.commit()
    await session.refresh(load_request)
    return load_request


async def get_user_by_id(
    session: AsyncSession,
    user_id: UUID,
) -> Optional[User]:
    """
    Retrieve user by ID.
    
    Args:
        session: AsyncSession for database operations
        user_id: User ID
    
    Returns:
        User instance or None if not found
    """
    query = select(User).where(User.id == user_id)
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def get_subscription(
    session: AsyncSession,
    b2b_user_id: UUID,
) -> Optional[Subscription]:
    """
    Retrieve subscription for B2B user.
    
    Args:
        session: AsyncSession for database operations
        b2b_user_id: B2B user ID
    
    Returns:
        Subscription instance or None if not found
    """
    query = select(Subscription).where(
        Subscription.b2b_user_id == b2b_user_id
    )
    result = await session.execute(query)
    return result.scalar_one_or_none()
