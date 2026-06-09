import asyncio
import os
import sys

# Ensure the root directory is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement

from core.database import AsyncSessionLocal
from core.models import User, UserRole, Vehicle, VehicleVerificationStatus

async def seed_data():
    print("Seeding database with demo data...")
    async with AsyncSessionLocal() as session:
        # First, clear existing users to prevent duplicates
        # Using a simple raw SQL query or deleting them directly
        # For safety and cascade we'll just query and delete if we want to, but it's simpler to just create and ignore if they exist, or truncate.
        # Actually, let's just create new users with unique emails and catch IntegrityError or just query first.
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email.in_([
            "customer@loadkaro.in", "driver1@loadkaro.in", "driver2@loadkaro.in", "b2b@loadkaro.in"
        ])))
        existing_users = result.unique().scalars().all()
        user_ids = [u.id for u in existing_users]
        if user_ids:
            vehicles_result = await session.execute(select(Vehicle).where(Vehicle.owner_id.in_(user_ids)))
            existing_vehicles = vehicles_result.scalars().all()
            for v in existing_vehicles:
                await session.delete(v)
            
        for u in existing_users:
            await session.delete(u)
        await session.commit()

        # Create Demo Customer
        customer = User(
            name="Rahul Sharma",
            email="customer@loadkaro.in",
            hashed_password="fakehash_password",
            role=UserRole.customer,
            is_active=True
        )

        # Create Demo Driver 1 (Near Indiranagar: ~12.9784, 77.6408)
        driver1 = User(
            name="Suresh Kumar",
            email="driver1@loadkaro.in",
            hashed_password="fakehash_password",
            role=UserRole.driver,
            is_active=True,
            current_location="POINT(77.6408 12.9784)"
        )

        # Create Demo Driver 2 (Near Koramangala: ~12.9352, 77.6245)
        driver2 = User(
            name="Ramesh Singh",
            email="driver2@loadkaro.in",
            hashed_password="fakehash_password",
            role=UserRole.driver,
            is_active=True,
            current_location="POINT(77.6245 12.9352)"
        )

        # Create Demo B2B Partner
        b2b = User(
            name="Reliance Fresh",
            email="b2b@loadkaro.in",
            hashed_password="fakehash_password",
            role=UserRole.b2b_partner,
            is_active=True
        )

        session.add_all([customer, driver1, driver2, b2b])
        await session.commit()

        # Create Vehicles for Drivers
        v1 = Vehicle(
            owner_id=driver1.id,
            type="Tata Ace",
            capacity_volume=100.0,
            license_plate="KA01AB1234",
            verification_status=VehicleVerificationStatus.verified
        )

        v2 = Vehicle(
            owner_id=driver2.id,
            type="Mahindra Bolero",
            capacity_volume=150.0,
            license_plate="KA05CD5678",
            verification_status=VehicleVerificationStatus.verified
        )

        session.add_all([v1, v2])
        await session.commit()

        print("Database seeded successfully!")
        print("  - Customer: customer@loadkaro.in")
        print("  - Driver 1: driver1@loadkaro.in (Tata Ace, Indiranagar)")
        print("  - Driver 2: driver2@loadkaro.in (Bolero, Koramangala)")
        print("  - B2B Partner: b2b@loadkaro.in")

if __name__ == "__main__":
    asyncio.run(seed_data())
