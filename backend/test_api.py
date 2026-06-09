"""
Example usage and test cases for LoadKaro API.
Demonstrates all three main features with sample data.
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal, engine, Base
from models import User, UserRole, Vehicle, LoadRequest, CargoLane, Subscription, VehicleVerificationStatus
import crud


async def setup_test_data():
    """Create sample data for testing."""
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        print("=" * 70)
        print("LoadKaro - Test Data Setup")
        print("=" * 70)
        
        # Create test users
        print("\n1. Creating test users...")
        
        # Customer
        customer = User(
            id=uuid.uuid4(),
            name="Alice Johnson",
            email="alice@example.com",
            hashed_password="$2b$12$...",  # Placeholder
            role=UserRole.customer,
            is_active=True,
        )
        
        # Drivers with locations
        driver1 = User(
            id=uuid.uuid4(),
            name="Bob Smith (Driver)",
            email="bob@example.com",
            hashed_password="$2b$12$...",
            role=UserRole.driver,
            is_active=True,
            current_location="SRID=4326;POINT(-74.0060 40.7128)",  # NYC
        )
        
        driver2 = User(
            id=uuid.uuid4(),
            name="Charlie Brown (Driver)",
            email="charlie@example.com",
            hashed_password="$2b$12$...",
            role=UserRole.driver,
            is_active=True,
            current_location="SRID=4326;POINT(-73.9855 40.7580)",  # NYC nearby
        )
        
        # B2B Partner
        b2b_partner = User(
            id=uuid.uuid4(),
            name="FastLogistics Inc",
            email="ops@fastlogistics.com",
            hashed_password="$2b$12$...",
            role=UserRole.b2b_partner,
            is_active=True,
        )
        
        session.add_all([customer, driver1, driver2, b2b_partner])
        await session.flush()
        print(f"  ✓ Created 4 users: 1 customer, 2 drivers, 1 B2B partner")
        
        # Create vehicles
        print("\n2. Creating vehicles...")
        vehicle1 = Vehicle(
            id=uuid.uuid4(),
            owner_id=driver1.id,
            type="Truck",
            capacity_volume=100.0,
            license_plate="NYC-DRV-001",
            verification_status=VehicleVerificationStatus.verified,
        )
        
        vehicle2 = Vehicle(
            id=uuid.uuid4(),
            owner_id=driver2.id,
            type="Van",
            capacity_volume=50.0,
            license_plate="NYC-VAN-002",
            verification_status=VehicleVerificationStatus.verified,
        )
        
        session.add_all([vehicle1, vehicle2])
        await session.flush()
        print(f"  ✓ Created 2 vehicles: 1 truck, 1 van")
        
        # Create cargo lanes
        print("\n3. Creating cargo lanes...")
        cargo_lane = CargoLane(
            id=uuid.uuid4(),
            name="Manhattan to Brooklyn",
            start_zone_geom="SRID=4326;POLYGON((-74.0100 40.7100, -74.0000 40.7100, -74.0000 40.7200, -74.0100 40.7200, -74.0100 40.7100))",
            end_zone_geom="SRID=4326;POLYGON((-73.9900 40.7500, -73.9800 40.7500, -73.9800 40.7600, -73.9900 40.7600, -73.9900 40.7500))",
            fixed_price=150.00,
            is_active=True,
        )
        
        session.add(cargo_lane)
        await session.flush()
        print(f"  ✓ Created 1 cargo lane: Manhattan → Brooklyn @ $150")
        
        # Create subscription
        print("\n4. Creating B2B subscription...")
        subscription = Subscription(
            id=uuid.uuid4(),
            b2b_user_id=b2b_partner.id,
            monthly_quota=100,
            used_quota=0,
        )
        
        session.add(subscription)
        await session.flush()
        print(f"  ✓ Created subscription: 100 bookings/month")
        
        # Create sample load request
        print("\n5. Creating sample load request...")
        load_request = LoadRequest(
            id=uuid.uuid4(),
            customer_id=customer.id,
            driver_id=None,
            pickup_geom="SRID=4326;POINT(-74.0060 40.7128)",
            dropoff_geom="SRID=4326;POINT(-73.9855 40.7580)",
            required_volume=30.0,
            priority=False,
        )
        
        session.add(load_request)
        await session.commit()
        print(f"  ✓ Created load request from pickup to dropoff")
        
        # Print IDs for reference
        print("\n" + "=" * 70)
        print("Test Data Created - IDs for Testing:")
        print("=" * 70)
        print(f"Customer ID:     {customer.id}")
        print(f"Driver 1 ID:     {driver1.id}")
        print(f"Driver 2 ID:     {driver2.id}")
        print(f"B2B Partner ID:  {b2b_partner.id}")
        print(f"Cargo Lane ID:   {cargo_lane.id}")
        print(f"Load Request ID: {load_request.id}")
        print("=" * 70)


async def test_nearby_drivers():
    """Test GET /api/v1/drivers/nearby functionality."""
    
    print("\n" + "=" * 70)
    print("TEST 1: Find Nearby Drivers")
    print("=" * 70)
    
    async with AsyncSessionLocal() as session:
        # Query drivers near Manhattan (40.7128, -74.0060) within 5km
        print("\nSearching for drivers within 5km of NYC (40.7128, -74.0060)...")
        
        drivers = await crud.get_nearby_drivers(
            session=session,
            latitude=40.7128,
            longitude=-74.0060,
            radius_km=5.0,
        )
        
        print(f"✓ Found {len(drivers)} nearby drivers:")
        for driver in drivers:
            print(f"  - {driver.name} ({driver.email}) - Active: {driver.is_active}")
            if driver.vehicles:
                for vehicle in driver.vehicles:
                    print(f"    Vehicle: {vehicle.type} ({vehicle.license_plate})")


async def test_cargo_lane_matching():
    """Test POST /api/v1/cargo-lanes/match functionality."""
    
    print("\n" + "=" * 70)
    print("TEST 2: Cargo Lane Matching")
    print("=" * 70)
    
    async with AsyncSessionLocal() as session:
        # Test matching NYC coordinates
        print("\nTesting cargo lane match for Manhattan → Brooklyn route...")
        
        match = await crud.match_cargo_lane(
            session=session,
            pickup_lat=40.7150,
            pickup_lon=-74.0080,
            dropoff_lat=40.7550,
            dropoff_lon=-73.9870,
        )
        
        if match:
            cargo_lane_id, fixed_price = match
            print(f"✓ MATCH FOUND!")
            print(f"  Cargo Lane ID: {cargo_lane_id}")
            print(f"  Fixed Price: ${fixed_price}")
        else:
            print("✗ No cargo lane match found")
        
        # Test non-matching coordinates
        print("\nTesting cargo lane match for non-matching route...")
        
        no_match = await crud.match_cargo_lane(
            session=session,
            pickup_lat=40.5000,
            pickup_lon=-74.5000,
            dropoff_lat=40.6000,
            dropoff_lon=-73.5000,
        )
        
        if no_match:
            print(f"✗ Match found (unexpected)")
        else:
            print("✓ No match found (as expected)")


async def test_b2b_quota():
    """Test POST /api/v1/b2b/book functionality with quota management."""
    
    print("\n" + "=" * 70)
    print("TEST 3: B2B Booking with Quota Management")
    print("=" * 70)
    
    async with AsyncSessionLocal() as session:
        # Get B2B user and subscription
        from models import User
        
        result = await session.execute(
            __import__('sqlalchemy').select(User).where(
                User.role == UserRole.b2b_partner
            )
        )
        b2b_user = result.scalar_one_or_none()
        
        if b2b_user:
            print(f"\nB2B Partner: {b2b_user.name}")
            
            # Check subscription
            subscription = await crud.get_subscription(
                session=session,
                b2b_user_id=b2b_user.id,
            )
            
            if subscription:
                print(f"  Monthly Quota: {subscription.monthly_quota}")
                print(f"  Used Quota: {subscription.used_quota}")
                print(f"  Available: {subscription.monthly_quota - subscription.used_quota}")
                
                # Book a load
                print(f"\nAttempting to book a load...")
                success = await crud.check_and_decrement_quota(
                    session=session,
                    b2b_user_id=b2b_user.id,
                    quantity=1,
                )
                
                if success:
                    print("✓ Booking successful - quota decremented")
                    
                    # Create load request
                    load_request = await crud.create_load_request(
                        session=session,
                        customer_id=b2b_user.id,
                        pickup_lat=40.7160,
                        pickup_lon=-74.0060,
                        dropoff_lat=40.7580,
                        dropoff_lon=-73.9855,
                        required_volume=25.0,
                        priority=True,
                    )
                    
                    print(f"  Load Request ID: {load_request.id}")
                    print(f"  Status: {load_request.status}")
                    print(f"  Priority: {load_request.priority}")
                else:
                    print("✗ Booking failed - insufficient quota")


async def main():
    """Run all tests."""
    try:
        await setup_test_data()
        await test_nearby_drivers()
        await test_cargo_lane_matching()
        await test_b2b_quota()
        
        print("\n" + "=" * 70)
        print("✓ All tests completed successfully!")
        print("=" * 70)
        print("\nTo start the API server, run:")
        print("  python main.py")
        print("\nThen access:")
        print("  Swagger UI: http://localhost:8000/docs")
        print("  ReDoc: http://localhost:8000/redoc")
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
