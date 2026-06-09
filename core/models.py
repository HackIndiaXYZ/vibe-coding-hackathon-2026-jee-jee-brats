import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from .database import Base


class UserRole(enum.Enum):
    customer = "customer"
    driver = "driver"
    b2b_partner = "b2b_partner"


class LoadRequestStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    in_transit = "in_transit"
    completed = "completed"
    cancelled = "cancelled"


class VehicleVerificationStatus(enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    current_location = Column(Geometry("POINT", srid=4326), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vehicles = relationship("Vehicle", back_populates="owner", lazy="joined")
    subscriptions = relationship("Subscription", back_populates="b2b_user", lazy="joined")
    load_requests = relationship(
        "LoadRequest",
        back_populates="customer",
        foreign_keys="LoadRequest.customer_id",
        lazy="selectin",
    )
    assigned_requests = relationship(
        "LoadRequest",
        back_populates="driver",
        foreign_keys="LoadRequest.driver_id",
        lazy="selectin",
    )


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(60), nullable=False)
    capacity_volume = Column(Numeric(10, 2), nullable=False)
    license_plate = Column(String(32), unique=True, nullable=False, index=True)
    verification_status = Column(
        Enum(VehicleVerificationStatus, name="vehicle_verification_status"),
        nullable=False,
        default=VehicleVerificationStatus.pending,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="vehicles")


class LoadRequest(Base):
    __tablename__ = "load_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    pickup_geom = Column(Geometry("POINT", srid=4326), nullable=False)
    dropoff_geom = Column(Geometry("POINT", srid=4326), nullable=False)
    status = Column(Enum(LoadRequestStatus, name="load_request_status"), nullable=False, default=LoadRequestStatus.pending)
    required_volume = Column(Numeric(10, 2), nullable=False)
    priority = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    customer = relationship("User", back_populates="load_requests", foreign_keys=[customer_id])
    driver = relationship("User", back_populates="assigned_requests", foreign_keys=[driver_id])


class CargoLane(Base):
    __tablename__ = "cargo_lanes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(140), nullable=False)
    start_zone_geom = Column(Geometry("POLYGON", srid=4326), nullable=False)
    end_zone_geom = Column(Geometry("POLYGON", srid=4326), nullable=False)
    fixed_price = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    b2b_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    monthly_quota = Column(Integer, nullable=False, default=0)
    used_quota = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    b2b_user = relationship("User", back_populates="subscriptions")
