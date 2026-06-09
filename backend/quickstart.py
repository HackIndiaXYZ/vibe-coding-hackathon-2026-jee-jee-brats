#!/usr/bin/env python
"""
LoadKaro - Quick Start Guide
Get the API running in 5 minutes
"""
import os
import sys
import subprocess
from pathlib import Path


def print_header(text: str):
    """Print formatted header."""
    print("\n" + "=" * 70)
    print(text.center(70))
    print("=" * 70)


def print_step(number: int, text: str):
    """Print step."""
    print(f"\n{'[%d]' % number:<8} {text}")


def check_python():
    """Verify Python version."""
    print_step(0, "Checking Python version...")
    
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print(f"✗ Python 3.10+ required, found {version.major}.{version.minor}")
        return False
    
    print(f"✓ Python {version.major}.{version.minor} detected")
    return True


def install_dependencies():
    """Install Python dependencies."""
    print_step(1, "Installing dependencies...")
    
    requirements_file = Path("requirements.txt")
    if not requirements_file.exists():
        print("✗ requirements.txt not found")
        return False
    
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q", "-r", "requirements.txt"],
            cwd=str(Path.cwd()),
        )
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install dependencies: {e}")
        return False


def setup_environment():
    """Setup environment variables."""
    print_step(2, "Setting up environment...")
    
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if env_file.exists():
        print("✓ .env file already exists")
    elif env_example.exists():
        import shutil
        shutil.copy(env_example, env_file)
        print("✓ Created .env from .env.example")
    else:
        print("⚠ No .env file found, using defaults")
    
    return True


def check_database():
    """Check PostgreSQL connection."""
    print_step(3, "Checking database...")
    
    try:
        import asyncio
        from database import engine
        
        async def check_connection():
            try:
                async with engine.connect() as conn:
                    await conn.execute(__import__('sqlalchemy').text("SELECT 1"))
                    return True
            except Exception as e:
                print(f"  Error: {e}")
                return False
        
        result = asyncio.run(check_connection())
        
        if result:
            print("✓ Database connection successful")
            return True
        else:
            print("✗ Cannot connect to database")
            print("\n  Make sure PostgreSQL is running:")
            print("  Option A: Local installation")
            print("    brew install postgresql (macOS)")
            print("    apt install postgresql (Linux)")
            print("\n  Option B: Docker")
            print("    docker-compose up -d postgres")
            return False
    except Exception as e:
        print(f"⚠ Database check failed: {e}")
        print("  You can initialize the database later with: python setup_db.py")
        return True  # Non-blocking


def initialize_database():
    """Initialize database schema."""
    print_step(4, "Initializing database...")
    
    try:
        subprocess.check_call([sys.executable, "setup_db.py"])
        print("✓ Database initialized successfully")
        return True
    except subprocess.CalledProcessError:
        print("⚠ Database initialization encountered issues")
        print("  Run manually: python setup_db.py")
        return True  # Non-blocking


def start_server():
    """Start development server."""
    print_step(5, "Starting API server...")
    
    print("\n✓ Starting FastAPI server on http://localhost:8000")
    print("\n  API Documentation:")
    print("    Swagger UI: http://localhost:8000/docs")
    print("    ReDoc: http://localhost:8000/redoc")
    print("\n  Running in development mode (with auto-reload)")
    print("  Press Ctrl+C to stop\n")
    
    try:
        subprocess.run([sys.executable, "main.py"])
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
        return True


def main():
    """Run quick start setup."""
    print_header("LoadKaro - Quick Start Setup")
    
    steps = [
        ("Python Check", check_python),
        ("Install Dependencies", install_dependencies),
        ("Setup Environment", setup_environment),
        ("Check Database", check_database),
        ("Initialize Database", initialize_database),
        ("Start Server", start_server),
    ]
    
    completed = 0
    for i, (name, func) in enumerate(steps, 1):
        if i < len(steps):  # Don't count server start in completion
            if not func():
                print(f"\n✗ Failed at step {i}: {name}")
                print("\n" + "=" * 70)
                print("Setup failed. Check the errors above.")
                print("=" * 70)
                return 1
            completed = i
        else:
            func()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
