"""
Alembic initial migration for LoadKaro database schema.
Creates all base tables with PostGIS geometry columns.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply migration: create tables and PostGIS extension."""
    
    # Enable PostGIS extension
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    
    # Create user_role enum
    user_role_enum = postgresql.ENUM('customer', 'driver', 'b2b_partner', name='user_role')
    user_role_enum.create(op.get_bind())
    
    # Create load_request_status enum
    load_status_enum = postgresql.ENUM(
        'pending', 'accepted', 'in_transit', 'completed', 'cancelled',
        name='load_request_status'
    )
    load_status_enum.create(op.get_bind())
    
    # Create vehicle_verification_status enum
    vehicle_status_enum = postgresql.ENUM('pending', 'verified', 'rejected', name='vehicle_verification_status')
    vehicle_status_enum.create(op.get_bind())
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', user_role_enum, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('current_location', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Index('ix_users_email', 'email'),
    )
    
    # Create vehicles table
    op.create_table(
        'vehicles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(60), nullable=False),
        sa.Column('capacity_volume', sa.Numeric(10, 2), nullable=False),
        sa.Column('license_plate', sa.String(32), nullable=False, unique=True),
        sa.Column('verification_status', vehicle_status_enum, nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_vehicles_license_plate', 'license_plate'),
    )
    
    # Create load_requests table
    op.create_table(
        'load_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('driver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('pickup_geom', Geometry('POINT', srid=4326), nullable=False),
        sa.Column('dropoff_geom', Geometry('POINT', srid=4326), nullable=False),
        sa.Column('status', load_status_enum, nullable=False, server_default='pending'),
        sa.Column('required_volume', sa.Numeric(10, 2), nullable=False),
        sa.Column('priority', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['driver_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create cargo_lanes table
    op.create_table(
        'cargo_lanes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('name', sa.String(140), nullable=False),
        sa.Column('start_zone_geom', Geometry('POLYGON', srid=4326), nullable=False),
        sa.Column('end_zone_geom', Geometry('POLYGON', srid=4326), nullable=False),
        sa.Column('fixed_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('b2b_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('monthly_quota', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('used_quota', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['b2b_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Revert migration: drop tables and extensions."""
    
    op.drop_table('subscriptions')
    op.drop_table('cargo_lanes')
    op.drop_table('load_requests')
    op.drop_table('vehicles')
    op.drop_table('users')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS user_role CASCADE")
    op.execute("DROP TYPE IF EXISTS load_request_status CASCADE")
    op.execute("DROP TYPE IF EXISTS vehicle_verification_status CASCADE")
