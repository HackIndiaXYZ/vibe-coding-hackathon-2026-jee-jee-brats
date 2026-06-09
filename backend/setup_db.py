"""
Database initialization script - Creates tables and PostGIS extension.
Run this before starting the application.
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from database import engine, Base


async def init_db():
    """Initialize database: enable PostGIS and create tables."""
    
    async with engine.begin() as conn:
        # Enable PostGIS extension
        print("Enabling PostGIS extension...")
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            print("✓ PostGIS extension enabled")
        except Exception as e:
            print(f"⚠ PostGIS extension: {e}")
        
        # Create tables from SQLAlchemy models
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("✓ All tables created successfully")
        
        # Verify geometry columns
        print("\nVerifying geometry columns...")
        result = await conn.execute(
            text("""
                SELECT table_name, column_name, udt_name 
                FROM information_schema.columns 
                WHERE udt_name = 'geometry'
                ORDER BY table_name, column_name;
            """)
        )
        
        geom_columns = result.fetchall()
        if geom_columns:
            print("Geometry columns found:")
            for table, column, udt_type in geom_columns:
                print(f"  - {table}.{column} ({udt_type})")
        else:
            print("No geometry columns found")


async def main():
    """Run database initialization."""
    print("=" * 60)
    print("LoadKaro Database Initialization")
    print("=" * 60)
    
    try:
        await init_db()
        print("\n✓ Database initialization completed successfully!")
    except Exception as e:
        print(f"\n✗ Database initialization failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
