"""
Quick API testing script - Test all endpoints without pytest.
Run this script to verify API functionality.
"""
import asyncio
import sys
from typing import Dict, Any

# Async HTTP client using httpx
try:
    import httpx
except ImportError:
    print("⚠️  httpx not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx


BASE_URL = "http://localhost:8000"


async def test_health() -> bool:
    """Test health endpoint."""
    print("\n" + "=" * 70)
    print("TEST 1: Health Check")
    print("=" * 70)
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BASE_URL}/api/v1/health")
            
            if response.status_code == 200:
                print("✓ Health check passed")
                print(f"  Response: {response.json()}")
                return True
            else:
                print(f"✗ Health check failed: {response.status_code}")
                return False
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        print(f"  Make sure the API is running at {BASE_URL}")
        return False


async def test_nearby_drivers() -> bool:
    """Test nearby drivers endpoint."""
    print("\n" + "=" * 70)
    print("TEST 2: Find Nearby Drivers")
    print("=" * 70)
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Query with NYC coordinates
            params = {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "radius_km": 5.0,
            }
            
            response = await client.get(
                f"{BASE_URL}/api/v1/drivers/nearby",
                params=params,
            )
            
            if response.status_code == 200:
                data = response.json()
                drivers = data.get("drivers", [])
                print(f"✓ Found {len(drivers)} nearby drivers")
                
                for driver in drivers[:3]:  # Show first 3
                    print(f"  - {driver['name']} ({driver['email']})")
                
                if len(drivers) > 3:
                    print(f"  ... and {len(drivers) - 3} more")
                
                return True
            else:
                print(f"✗ Failed to get drivers: {response.status_code}")
                print(f"  {response.text}")
                return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


async def test_cargo_lane_match() -> bool:
    """Test cargo lane matching endpoint."""
    print("\n" + "=" * 70)
    print("TEST 3: Cargo Lane Matching")
    print("=" * 70)
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {
                "pickup_latitude": 40.7150,
                "pickup_longitude": -74.0080,
                "dropoff_latitude": 40.7550,
                "dropoff_longitude": -73.9870,
            }
            
            response = await client.post(
                f"{BASE_URL}/api/v1/cargo-lanes/match",
                json=payload,
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("fixed_price"):
                    print(f"✓ Cargo lane match found!")
                    print(f"  Lane ID: {data['cargo_lane_id']}")
                    print(f"  Fixed Price: ${data['fixed_price']}")
                else:
                    print("✓ No cargo lane match (as expected for test coordinates)")
                    print(f"  fixed_price: {data['fixed_price']}")
                    print(f"  cargo_lane_id: {data['cargo_lane_id']}")
                
                return True
            else:
                print(f"✗ Failed to match cargo lane: {response.status_code}")
                print(f"  {response.text}")
                return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


async def test_invalid_coordinates() -> bool:
    """Test error handling with invalid coordinates."""
    print("\n" + "=" * 70)
    print("TEST 4: Error Handling (Invalid Coordinates)")
    print("=" * 70)
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Invalid latitude (> 90)
            params = {
                "latitude": 95.0,
                "longitude": -74.0060,
                "radius_km": 5.0,
            }
            
            response = await client.get(
                f"{BASE_URL}/api/v1/drivers/nearby",
                params=params,
            )
            
            if response.status_code == 400:
                print("✓ Invalid latitude properly rejected")
                print(f"  Error: {response.json()['detail']}")
                return True
            else:
                print(f"✗ Expected 400, got {response.status_code}")
                return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


async def main():
    """Run all tests."""
    print("=" * 70)
    print("LoadKaro API Test Suite")
    print("=" * 70)
    print(f"Testing API at: {BASE_URL}")
    
    results = {
        "Health Check": await test_health(),
        "Nearby Drivers": await test_nearby_drivers(),
        "Cargo Lane Match": await test_cargo_lane_match(),
        "Error Handling": await test_invalid_coordinates(),
    }
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
