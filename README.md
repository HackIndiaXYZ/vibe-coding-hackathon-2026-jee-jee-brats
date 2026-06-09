# LoadKaro - High-Performance Geospatial Freight Matching Platform

**Hackathon Project**: Jee Jee Brats - VibeCoding Hackathon 2026

Hyper-local freight matching platform with real-time driver discovery, pre-mapped cargo lanes, and B2B subscription management.

## 🚀 Quick Start

### Installation
```bash
# Clone and setup
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Initialize database
python setup_db.py

# Run the API
python main.py
```

### Access API
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## ✨ Features

### 1. **Hyper-Local Driver Matching** 🚗
- Real-time proximity search using PostGIS `ST_DWithin`
- Find active drivers within configurable radius (default 5km)
- Efficient geospatial indexing for millions of location updates
- **Endpoint**: `GET /api/v1/drivers/nearby`

### 2. **Cargo Lane Matching** 📍
- Pre-defined geographic routes with fixed pricing
- Uses PostGIS `ST_Contains` for zone verification
- Bypasses auction system for optimized routes
- **Endpoint**: `POST /api/v1/cargo-lanes/match`

### 3. **B2B Subscription Management** 💼
- Atomic quota checking and decrement operations
- Monthly quota tracking with usage limits
- Priority load request assignment
- **Endpoint**: `POST /api/v1/b2b/book`

## 📋 Database Schema

| Table | Purpose |
|-------|---------|
| **users** | Customer, driver, and B2B partner accounts with location tracking |
| **vehicles** | Driver vehicle details with capacity and verification status |
| **load_requests** | Freight requests with pickup/dropoff geolocation |
| **cargo_lanes** | Pre-mapped geographic zones with fixed pricing |
| **subscriptions** | B2B partner quotas and usage tracking |

## 🔧 Tech Stack

- **Backend**: FastAPI (async)
- **Database**: PostgreSQL + PostGIS
- **ORM**: SQLAlchemy 2.0 (async mode)
- **Validation**: Pydantic v2
- **Migrations**: Alembic
- **Server**: Uvicorn

## 📚 Documentation

- [Full Implementation Guide](./IMPLEMENTATION.md) - Complete architecture, setup, and API reference
- [Test Examples](./test_api.py) - Sample code for all features

## 🧪 Testing

```bash
# Run test suite with sample data
python test_api.py
```

## API Examples

### Find Nearby Drivers
```bash
curl http://localhost:8000/api/v1/drivers/nearby?latitude=40.7128&longitude=-74.0060&radius_km=5
```

### Match Cargo Lane
```bash
curl -X POST http://localhost:8000/api/v1/cargo-lanes/match \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_latitude": 40.7128,
    "pickup_longitude": -74.0060,
    "dropoff_latitude": 40.7580,
    "dropoff_longitude": -73.9855
  }'
```

### Book with B2B Subscription
```bash
curl -X POST http://localhost:8000/api/v1/b2b/book \
  -H "Content-Type: application/json" \
  -d '{
    "b2b_user_id": "550e8400-e29b-41d4-a716-446655440000",
    "pickup_latitude": 40.7128,
    "pickup_longitude": -74.0060,
    "dropoff_latitude": 40.7580,
    "dropoff_longitude": -73.9855,
    "required_volume": 50.0,
    "priority": true
  }'
```

## 📊 Architecture

```
LoadKaro API
├── main.py           # FastAPI application & endpoints
├── crud.py           # Database operations & PostGIS queries
├── models.py         # SQLAlchemy ORM models
├── schemas.py        # Pydantic validation schemas
├── database.py       # Async database setup
├── setup_db.py       # Database initialization
└── test_api.py       # Test suite with examples
```

## 🔒 Core Operations

### Geospatial Queries
- **ST_DWithin**: Proximity-based driver search within radius
- **ST_Contains**: Zone-based cargo lane matching
- **SRID 4326**: WGS84 geographic coordinate system

### Subscription Management
- Atomic quota operations using SQLAlchemy transactions
- Monthly quota reset and usage tracking
- Priority request flag for B2B partners

## 🚀 Performance

- Spatial indices on geometry columns (GIST)
- Connection pooling with asyncpg
- Async/await throughout for non-blocking I/O
- Optimized join paths with eager loading

## 📝 Environment Variables

```bash
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/loadkaro
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=info
HOST=0.0.0.0
PORT=8000
```

## 📦 Dependencies

See [requirements.txt](./requirements.txt) for all dependencies:
- FastAPI 0.104.1
- SQLAlchemy 2.0.23
- GeoAlchemy2 0.14.1
- asyncpg 0.29.0
- Pydantic 2.5.0

## 🛠️ Development

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head

# Revert migration
alembic downgrade -1
```

### Code Structure
- Type-hinted Python code for better IDE support
- Async/await patterns throughout
- PostGIS-specific geometry handling
- Comprehensive error handling with proper HTTP status codes

## 👥 Team
**Jee Jee Brats** - VibeCoding Hackathon 2026

## 📄 License
See LICENSE file
