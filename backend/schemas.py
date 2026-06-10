from __future__ import annotations

from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, PositiveFloat


class UserRole(str, Enum):
    customer = "customer"
    driver = "driver"
    b2b_partner = "b2b_partner"


class LoadRequestStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    in_transit = "in_transit"
    completed = "completed"
    cancelled = "cancelled"


class DriverDTO(BaseModel):
    id: UUID
    name: str
    email: str
    role: UserRole
    is_active: bool

    model_config = {
        "from_attributes": True,
    }


class NearbyDriversResponse(BaseModel):
    drivers: List[DriverDTO]


class CargoLaneMatchRequest(BaseModel):
    pickup_latitude: float = Field(..., ge=-90.0, le=90.0)
    pickup_longitude: float = Field(..., ge=-180.0, le=180.0)
    dropoff_latitude: float = Field(..., ge=-90.0, le=90.0)
    dropoff_longitude: float = Field(..., ge=-180.0, le=180.0)


class CargoLaneMatchResponse(BaseModel):
    fixed_price: Optional[float] = None
    cargo_lane_id: Optional[UUID] = None


class B2BBookRequest(BaseModel):
    b2b_user_id: UUID
    pickup_latitude: float = Field(..., ge=-90.0, le=90.0)
    pickup_longitude: float = Field(..., ge=-180.0, le=180.0)
    dropoff_latitude: float = Field(..., ge=-90.0, le=90.0)
    dropoff_longitude: float = Field(..., ge=-180.0, le=180.0)
    required_volume: PositiveFloat
    priority: bool = True


class B2BBookResponse(BaseModel):
    load_request_id: UUID
    status: LoadRequestStatus
    priority: bool
    required_volume: float


class ErrorResponse(BaseModel):
    detail: str


class PlaceSuggestion(BaseModel):
    id: str
    title: str
    description: str
    latitude: float
    longitude: float


class PlacesSuggestResponse(BaseModel):
    suggestions: List[PlaceSuggestion]


class PriceEstimateRequest(BaseModel):
    pickup_latitude: float = Field(..., ge=-90.0, le=90.0)
    pickup_longitude: float = Field(..., ge=-180.0, le=180.0)
    dropoff_latitude: float = Field(..., ge=-90.0, le=90.0)
    dropoff_longitude: float = Field(..., ge=-180.0, le=180.0)
    scheduled_time: Optional[str] = None
    ride_mode: Optional[str] = "solo"


class PriceEstimateResponse(BaseModel):
    estimated_price: float

class ReverseGeocodeResponse(BaseModel):
    title: str
    description: str
