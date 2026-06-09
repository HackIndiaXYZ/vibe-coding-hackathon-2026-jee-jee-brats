"""
LoadKaro Core Module
Main API, database operations, models, and schemas
"""

from .main import app
from .crud import (
    get_nearby_drivers,
    match_cargo_lane,
    check_and_decrement_quota,
    create_load_request,
)
from .models import User, UserRole, LoadRequest, Vehicle, CargoLane, Subscription
from .schemas import (
    DriverDTO,
    CargoLaneMatchRequest,
    CargoLaneMatchResponse,
    NearbyDriversResponse,
)

__all__ = [
    "app",
    "get_nearby_drivers",
    "match_cargo_lane",
    "check_and_decrement_quota",
    "create_load_request",
    "User",
    "UserRole",
    "LoadRequest",
    "Vehicle",
    "CargoLane",
    "Subscription",
    "DriverDTO",
    "CargoLaneMatchRequest",
    "CargoLaneMatchResponse",
    "NearbyDriversResponse",
]
