# LoadKaro Development Guide

## Project Structure

```
loadkaro/
├── main.py                 # FastAPI application entry point
├── crud.py                # Database CRUD operations with PostGIS queries
├── models.py              # SQLAlchemy ORM models
├── schemas.py             # Pydantic request/response schemas
├── database.py            # Async database configuration
├── config.py              # Application settings
├── setup_db.py            # Database initialization script
├── test_api.py            # Test suite with examples
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── Dockerfile             # Docker container image
├── docker-compose.yml     # Multi-container setup
├── IMPLEMENTATION.md      # Complete implementation documentation
└── README.md              # Project overview
```

## Development Workflow

### 1. Environment Setup

```bash
# Clone repository
git clone <repo>
cd loadkaro

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

### 2. Database Setup

```bash
# Option A: Local PostgreSQL
# Ensure PostgreSQL is running with PostGIS extension

# Option B: Docker
docker-compose up -d postgres

# Initialize database
python setup_db.py
```

### 3. Running the Application

```bash
# Development mode (with auto-reload)
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Testing

```bash
# Run test suite
python test_api.py

# Run with verbose output
python test_api.py -v

# Test specific feature
pytest test_api.py::test_nearby_drivers -v
```

## Code Examples

### Creating a Nearby Driver Query

```python
from crud import get_nearby_drivers
from database import AsyncSessionLocal

async def find_drivers():
    async with AsyncSessionLocal() as session:
        drivers = await get_nearby_drivers(
            session=session,
            latitude=40.7128,
            longitude=-74.0060,
            radius_km=5.0,
        )
        return drivers
```

### Matching Cargo Lanes

```python
from crud import match_cargo_lane

async def find_cargo_lane():
    async with AsyncSessionLocal() as session:
        match = await match_cargo_lane(
            session=session,
            pickup_lat=40.7128,
            pickup_lon=-74.0060,
            dropoff_lat=40.7580,
            dropoff_lon=-73.9855,
        )
        if match:
            lane_id, price = match
            return {"cargo_lane_id": lane_id, "fixed_price": price}
```

### B2B Booking with Quota

```python
from crud import check_and_decrement_quota, create_load_request
import uuid

async def book_with_quota():
    b2b_user_id = uuid.UUID("...")
    
    async with AsyncSessionLocal() as session:
        # Check and decrement quota
        success = await check_and_decrement_quota(
            session=session,
            b2b_user_id=b2b_user_id,
            quantity=1,
        )
        
        if success:
            # Create load request
            load = await create_load_request(
                session=session,
                customer_id=b2b_user_id,
                pickup_lat=40.7128,
                pickup_lon=-74.0060,
                dropoff_lat=40.7580,
                dropoff_lon=-73.9855,
                required_volume=50.0,
                priority=True,
            )
            return load
```

## Database Operations

### Raw SQL Queries

```python
from sqlalchemy import text
from database import AsyncSessionLocal

async def custom_query():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT * FROM users
                WHERE role = 'driver'
                AND is_active = true
                LIMIT 10
            """)
        )
        return result.fetchall()
```

### PostGIS Functions

```python
from geoalchemy2.functions import ST_DWithin, ST_Contains, ST_Distance

# Within distance
ST_DWithin(User.current_location, point, distance)

# Contains
ST_Contains(CargoLane.start_zone_geom, point)

# Distance
ST_Distance(location1, location2)
```

## Common Issues & Solutions

### 1. PostGIS Extension Not Found
```
Error: Could not locate a matching set of packages for the following specification
```

**Solution**: Install PostGIS separately or use the postgis/postgis Docker image:
```bash
docker pull postgis/postgis:15-3.3
```

### 2. Connection Pool Exhaustion
```
QueuePool limit reached
```

**Solution**: Increase pool size in `database.py`:
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
)
```

### 3. Geometry Column Errors
```
Error: Could not create geometry column
```

**Solution**: Ensure SRID is specified correctly:
```python
Column(Geometry("POINT", srid=4326), nullable=False)
```

### 4. Async Session Context Issues
```
Error: greenlet_spawn has not been called
```

**Solution**: Always use async context managers:
```python
async with AsyncSessionLocal() as session:
    # queries here
```

## Performance Optimization

### 1. Add Spatial Indices

```sql
CREATE INDEX idx_users_location ON users USING GIST(current_location);
CREATE INDEX idx_cargo_lanes_start ON cargo_lanes USING GIST(start_zone_geom);
CREATE INDEX idx_cargo_lanes_end ON cargo_lanes USING GIST(end_zone_geom);
```

### 2. Query Optimization

```python
# Use lazy loading for relationships
User.vehicles = relationship("Vehicle", lazy="selectin")

# Use efficient joins
query = select(User).options(
    joinedload(User.vehicles),
    joinedload(User.subscriptions)
)
```

### 3. Connection Pooling

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections
    pool_size=10,
    max_overflow=20,
)
```

## Docker Deployment

### Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Clean up volumes
docker-compose down -v
```

### Building Custom Images

```bash
# Build image
docker build -t loadkaro:latest .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://... \
  loadkaro:latest
```

## API Documentation

Interactive API docs are available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Contributing Guidelines

1. Create feature branch: `git checkout -b feature/xyz`
2. Add tests for new functionality
3. Follow type hints and async patterns
4. Update documentation
5. Submit pull request

## Debugging

### Enable SQL Query Logging

```python
# In database.py
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Log all SQL queries
)
```

### Debug Async Tasks

```python
import asyncio
asyncio.set_debug(True)
```

### View Database Queries

Use pgAdmin or psql:
```bash
psql -U loadkaro -d loadkaro
```

## Monitoring

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

### Database Connection Status

```python
from database import engine
async def check_db():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        return result.scalar()
```

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [PostGIS Manual](https://postgis.net/documentation/)
- [GeoAlchemy2 Docs](https://geoalchemy-2.readthedocs.io/)
- [Pydantic v2](https://docs.pydantic.dev/latest/)

## Support

For issues and questions:
1. Check existing documentation
2. Review test cases in `test_api.py`
3. Check FastAPI and SQLAlchemy docs
4. Open an issue with detailed description
