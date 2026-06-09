# LoadKaro - High-Performance Geospatial Freight Matching

FastAPI-based backend infrastructure for hyper-local freight matching with PostGIS geospatial database.

## Architecture Overview

- **Framework**: FastAPI (Async)
- **Database**: PostgreSQL with PostGIS extension
- **ORM**: SQLAlchemy 2.0 (Async mode) + GeoAlchemy2
- **Validation**: Pydantic v2
- **Migrations**: Alembic

## Core Features

### 1. **Hyper-Local Driver Matching** (`GET /api/v1/drivers/nearby`)
- Uses PostGIS `ST_DWithin` for efficient proximity searches
- Finds active drivers within configurable radius (default 5km)
- Optimized for real-time location tracking of millions of drivers

### 2. **Cargo Lane Matching** (`POST /api/v1/cargo-lanes/match`)
- Pre-mapped geographic "Cargo Lanes" with fixed pricing
- Uses PostGIS `ST_Contains` to verify if pickup/dropoff fall within lane zones
- Bypasses auction system for pre-defined routes

### 3. **B2B Subscription Management** (`POST /api/v1/b2b/book`)
- Atomic quota checking and decrement
- Priority load requests for B2B partners
- Monthly quota system with usage tracking

## Database Schema

### Users Table
```sql
- id (UUID, PK)
- name (String)
- email (String, Unique)
- hashed_password (String)
- role (ENUM: customer, driver, b2b_partner)
- is_active (Boolean)
- current_location (POINT, SRID 4326)
- created_at (DateTime)
```

### Vehicles Table
```sql
- id (UUID, PK)
- owner_id (UUID, FK -> users)
- type (String)
- capacity_volume (Numeric)
- license_plate (String, Unique)
- verification_status (ENUM: pending, verified, rejected)
- created_at (DateTime)
```

### LoadRequests Table
```sql
- id (UUID, PK)
- customer_id (UUID, FK -> users)
- driver_id (UUID, FK -> users, nullable)
- pickup_geom (POINT, SRID 4326)
- dropoff_geom (POINT, SRID 4326)
- status (ENUM: pending, accepted, in_transit, completed, cancelled)
- required_volume (Numeric)
- priority (Boolean)
- created_at (DateTime)
```

### CargoLanes Table
```sql
- id (UUID, PK)
- name (String)
- start_zone_geom (POLYGON, SRID 4326)
- end_zone_geom (POLYGON, SRID 4326)
- fixed_price (Numeric)
- is_active (Boolean)
- created_at (DateTime)
```

### Subscriptions Table
```sql
- id (UUID, PK)
- b2b_user_id (UUID, FK -> users)
- monthly_quota (Integer)
- used_quota (Integer)
- updated_at (DateTime)
```

## Setup Instructions

### 1. Prerequisites
- Python 3.10+
- PostgreSQL 14+ with PostGIS extension
- pip or poetry

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your database credentials
export $(cat .env | xargs)
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Initialize Database
```bash
# Enable PostGIS and create tables
python setup_db.py
```

### 5. Run Application
```bash
# Development
python main.py

# Or with uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 6. API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Check
```http
GET /api/v1/health
```

### Find Nearby Drivers
```http
GET /api/v1/drivers/nearby?latitude=40.7128&longitude=-74.0060&radius_km=5
```

**Response:**
```json
{
  "drivers": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "driver",
      "is_active": true
    }
  ]
}
```

### Match Cargo Lane
```http
POST /api/v1/cargo-lanes/match
Content-Type: application/json

{
  "pickup_latitude": 40.7128,
  "pickup_longitude": -74.0060,
  "dropoff_latitude": 40.7580,
  "dropoff_longitude": -73.9855
}
```

**Response:**
```json
{
  "fixed_price": 250.50,
  "cargo_lane_id": "uuid"
}
```

Or (no match):
```json
{
  "fixed_price": null,
  "cargo_lane_id": null
}
```

### B2B Booking with Quota
```http
POST /api/v1/b2b/book
Content-Type: application/json

{
  "b2b_user_id": "uuid",
  "pickup_latitude": 40.7128,
  "pickup_longitude": -74.0060,
  "dropoff_latitude": 40.7580,
  "dropoff_longitude": -73.9855,
  "required_volume": 50.0,
  "priority": true
}
```

**Response (201 Created):**
```json
{
  "load_request_id": "uuid",
  "status": "pending",
  "priority": true,
  "required_volume": 50.0
}
```

**Error (403 Insufficient Quota):**
```json
{
  "detail": "Insufficient quota. Monthly quota: 100, Used: 100"
}
```

## CRUD Operations (`crud.py`)

### `get_nearby_drivers()`
PostGIS proximity search using `ST_DWithin`.

**Parameters:**
- `session`: AsyncSession
- `latitude`: float
- `longitude`: float
- `radius_km`: float (default 5.0)

**Returns:** List[User]

### `match_cargo_lane()`
Checks if pickup/dropoff coordinates match any CargoLane using `ST_Contains`.

**Parameters:**
- `session`: AsyncSession
- `pickup_lat`: float
- `pickup_lon`: float
- `dropoff_lat`: float
- `dropoff_lon`: float

**Returns:** Optional[Tuple[UUID, float]] -> (cargo_lane_id, fixed_price)

### `check_and_decrement_quota()`
Atomically validates and decrements B2B subscription quota.

**Parameters:**
- `session`: AsyncSession
- `b2b_user_id`: UUID
- `quantity`: int (default 1)

**Returns:** bool

### `create_load_request()`
Creates a new LoadRequest with geolocation data.

**Parameters:**
- `session`: AsyncSession
- `customer_id`: UUID
- `pickup_lat`: float
- `pickup_lon`: float
- `dropoff_lat`: float
- `dropoff_lon`: float
- `required_volume`: float
- `priority`: bool (default False)

**Returns:** LoadRequest

## Performance Optimizations

### Geospatial Indices
```sql
-- Add spatial indices for faster PostGIS queries
CREATE INDEX idx_users_location ON users USING GIST(current_location);
CREATE INDEX idx_load_pickup ON load_requests USING GIST(pickup_geom);
CREATE INDEX idx_load_dropoff ON load_requests USING GIST(dropoff_geom);
CREATE INDEX idx_cargo_start_zone ON cargo_lanes USING GIST(start_zone_geom);
CREATE INDEX idx_cargo_end_zone ON cargo_lanes USING GIST(end_zone_geom);
```

### Connection Pooling
- SQLAlchemy async with asyncpg connection pooling
- Pre-ping enabled for reliability
- Future mode for better async/await support

### Query Optimization
- Lazy loading configured appropriately
- Spatial queries use PostGIS native functions
- Atomic operations for quota management

## Error Handling

- **400 Bad Request**: Invalid coordinates or parameters
- **403 Forbidden**: Insufficient subscription quota or user role mismatch
- **404 Not Found**: User or subscription not found
- **500 Internal Server Error**: Unhandled exceptions

## Development

### Run Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/ -v
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head

# Revert migration
alembic downgrade -1
```

## Production Deployment

1. Set `DEBUG=false` in environment
2. Use production-grade ASGI server (uvicorn with gunicorn)
3. Configure PostgreSQL connection pooling
4. Enable spatial indices
5. Set up monitoring and logging
6. Configure CORS appropriately
7. Use environment variables for secrets

## License
MIT License - See LICENSE file

## Author
LoadKaro Backend Engineering Team
