import asyncio
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement

# Import the base and models
from core.database import AsyncSessionLocal
from core.models import User, Vehicle, LoadRequest, CargoLane, UserRole, LoadRequestStatus, VehicleVerificationStatus

async def populate():
    async with AsyncSessionLocal() as session:
        # Create some drivers in Delhi/NCR area
        drivers = [
            User(
                id=uuid4(),
                name="Ramesh Kumar",
                email="ramesh.driver@example.com",
                hashed_password="hashed_pass_placeholder",
                role=UserRole.driver,
                # Location: Connaught Place, New Delhi
                current_location=WKTElement("POINT(77.216721 28.632808)", srid=4326),
            ),
            User(
                id=uuid4(),
                name="Suresh Singh",
                email="suresh.driver@example.com",
                hashed_password="hashed_pass_placeholder",
                role=UserRole.driver,
                # Location: Hauz Khas, New Delhi
                current_location=WKTElement("POINT(77.198906 28.549448)", srid=4326),
            ),
        ]
        session.add_all(drivers)

        # Create some customers
        customers = [
            User(
                id=uuid4(),
                name="Anjali Sharma",
                email="anjali.customer@example.com",
                hashed_password="hashed_pass_placeholder",
                role=UserRole.customer,
            ),
        ]
        session.add_all(customers)

        # Create B2B Partner
        b2b_partner = User(
            id=uuid4(),
            name="Delhi Logistics Co.",
            email="contact@delhilogistics.com",
            hashed_password="hashed_pass_placeholder",
            role=UserRole.b2b_partner,
        )
        session.add(b2b_partner)

        await session.flush()  # To get the generated UUIDs if not explicit, but they are explicit here

        # Create vehicles for drivers
        vehicles = [
            Vehicle(
                id=uuid4(),
                owner_id=drivers[0].id,
                type="tata_ace",
                capacity_volume=4.0,  # 4 m^3
                license_plate="DL 1L C 1234",
                verification_status=VehicleVerificationStatus.verified,
            ),
            Vehicle(
                id=uuid4(),
                owner_id=drivers[1].id,
                type="truck",
                capacity_volume=15.0, # 15 m^3
                license_plate="DL 1M B 5678",
                verification_status=VehicleVerificationStatus.verified,
            ),
        ]
        session.add_all(vehicles)

        # Create a Cargo Lane (e.g., Delhi to Gurgaon)
        # Using simple polygons for start and end zones
        delhi_gurgaon_lane = CargoLane(
            id=uuid4(),
            name="Delhi-Gurgaon Express Route",
            # Delhi Zone (rough bounding box)
            start_zone_geom=WKTElement("POLYGON((77.1 28.6, 77.3 28.6, 77.3 28.8, 77.1 28.8, 77.1 28.6))", srid=4326),
            # Gurgaon Zone (rough bounding box)
            end_zone_geom=WKTElement("POLYGON((76.9 28.3, 77.1 28.3, 77.1 28.5, 76.9 28.5, 76.9 28.3))", srid=4326),
            fixed_price=1200.00,
        )
        session.add(delhi_gurgaon_lane)

        # Create a pending load request
        load = LoadRequest(
            id=uuid4(),
            customer_id=customers[0].id,
            # Pickup in Delhi
            pickup_geom=WKTElement("POINT(77.200000 28.650000)", srid=4326),
            # Dropoff in Gurgaon
            dropoff_geom=WKTElement("POINT(77.020000 28.450000)", srid=4326),
            status=LoadRequestStatus.pending,
            required_volume=2.5,
            priority=False,
        )
        session.add(load)

        await session.commit()
        print("Successfully populated database with mock data!")


if __name__ == "__main__":
    asyncio.run(populate())
