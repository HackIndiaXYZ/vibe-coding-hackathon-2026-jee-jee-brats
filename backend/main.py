"""
LoadKaro FastAPI Application - Core Infrastructure
High-performance Python architecture with geospatial database for hyper-local driver matching.
"""
from typing import List
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import json

from database import get_session
from schemas import (
    NearbyDriversResponse,
    DriverDTO,
    CargoLaneMatchRequest,
    CargoLaneMatchResponse,
    B2BBookRequest,
    B2BBookResponse,
    ErrorResponse,
    PlacesSuggestResponse,
    PlaceSuggestion,
    PriceEstimateRequest,
    PriceEstimateResponse,
    ReverseGeocodeResponse,
)
import math
import urllib.request
import urllib.parse
import re
from models import UserRole
import crud

# Initialize FastAPI app
app = FastAPI(
    title="LoadKaro API",
    description="Hyper-local freight matching with geospatial database",
    version="1.0.0",
)

# Add CORS middleware to allow web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/api/v1/health",
    tags=["Health"],
    summary="Health check endpoint",
)
async def health_check():
    """System health status endpoint."""
    return {
        "status": "healthy",
        "service": "LoadKaro API",
    }


@app.websocket("/ws/loads")
async def websocket_loads(websocket: WebSocket):
    """
    WebSocket endpoint for real-time load broadcasting.
    Used by driver radar screen.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back a response or process bid
            try:
                message = json.loads(data)
                # In a real app, process the bid here
                await websocket.send_json({
                    "event": "bid_received",
                    "payload": {"status": "success", "message": message}
                })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass


@app.get(
    "/api/v1/drivers/nearby",
    response_model=NearbyDriversResponse,
    tags=["Drivers"],
    summary="Find nearby active drivers",
    responses={
        200: {"description": "List of nearby drivers"},
        400: {"model": ErrorResponse, "description": "Invalid parameters"},
    },
)
async def get_nearby_drivers(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    session: AsyncSession = Depends(get_session),
) -> NearbyDriversResponse:
    """
    Find active drivers within specified radius using PostGIS ST_DWithin.
    
    Query Parameters:
    - latitude: Customer/load location latitude (-90 to 90)
    - longitude: Customer/load location longitude (-180 to 180)
    - radius_km: Search radius in kilometers (default 5km)
    
    Returns:
    - List of driver DTOs with ID, name, email, role, and active status
    """
    # Validate coordinates
    if not (-90 <= latitude <= 90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude must be between -90 and 90",
        )
    if not (-180 <= longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude must be between -180 and 180",
        )
    if radius_km <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Radius must be positive",
        )
    
    # Execute geospatial query
    drivers = await crud.get_nearby_drivers(
        session=session,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )
    
    # Transform to DTOs
    driver_dtos = [
        DriverDTO(
            id=driver.id,
            name=driver.name,
            email=driver.email,
            role=driver.role,
            is_active=driver.is_active,
        )
        for driver in drivers
    ]
    
    return NearbyDriversResponse(drivers=driver_dtos)


@app.post(
    "/api/v1/cargo-lanes/match",
    response_model=CargoLaneMatchResponse,
    tags=["CargoLanes"],
    summary="Match pickup/dropoff to cargo lane",
    responses={
        200: {"description": "Cargo lane match result"},
        400: {"model": ErrorResponse, "description": "Invalid parameters"},
    },
)
async def match_cargo_lane(
    request: CargoLaneMatchRequest,
    session: AsyncSession = Depends(get_session),
) -> CargoLaneMatchResponse:
    """
    Check if pickup and dropoff coordinates match a pre-defined CargoLane.
    Uses PostGIS ST_Contains to verify if points fall within zone polygons.
    Returns fixed pricing if match found, bypassing auction system.
    
    Request body:
    - pickup_latitude: Pickup location latitude
    - pickup_longitude: Pickup location longitude
    - dropoff_latitude: Dropoff location latitude
    - dropoff_longitude: Dropoff location longitude
    
    Returns:
    - fixed_price: Price for this lane if matched, null otherwise
    - cargo_lane_id: ID of matched cargo lane, null if no match
    """
    # Execute cargo lane matching
    match_result = await crud.match_cargo_lane(
        session=session,
        pickup_lat=request.pickup_latitude,
        pickup_lon=request.pickup_longitude,
        dropoff_lat=request.dropoff_latitude,
        dropoff_lon=request.dropoff_longitude,
    )
    
    if match_result:
        cargo_lane_id, fixed_price = match_result
        return CargoLaneMatchResponse(
            fixed_price=fixed_price,
            cargo_lane_id=cargo_lane_id,
        )
    
    return CargoLaneMatchResponse(
        fixed_price=None,
        cargo_lane_id=None,
    )


@app.post(
    "/api/v1/b2b/book",
    response_model=B2BBookResponse,
    tags=["B2B"],
    summary="Book freight request with subscription quota",
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Load request created successfully"},
        400: {"model": ErrorResponse, "description": "Invalid parameters"},
        403: {"model": ErrorResponse, "description": "Insufficient quota"},
        404: {"model": ErrorResponse, "description": "User or subscription not found"},
    },
)
async def b2b_book(
    request: B2BBookRequest,
    session: AsyncSession = Depends(get_session),
) -> B2BBookResponse:
    """
    Book a freight request as B2B partner with subscription quota management.
    Atomically decrements monthly_quota and creates LoadRequest with priority flag.
    
    Request body:
    - b2b_user_id: B2B partner user ID
    - pickup_latitude: Pickup location latitude
    - pickup_longitude: Pickup location longitude
    - dropoff_latitude: Dropoff location latitude
    - dropoff_longitude: Dropoff location longitude
    - required_volume: Volume required in cubic units
    - priority: Priority flag for request (default true)
    
    Returns:
    - load_request_id: ID of created LoadRequest
    - status: Current status (pending)
    - priority: Priority flag
    - required_volume: Required volume
    
    Raises:
    - 404: User or subscription not found
    - 403: Insufficient quota available
    """
    # Verify user exists and is B2B partner
    user = await crud.get_user_by_id(session=session, user_id=request.b2b_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if user.role != UserRole.b2b_partner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a B2B partner",
        )
    
    # Check subscription exists
    subscription = await crud.get_subscription(session=session, b2b_user_id=request.b2b_user_id)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found for user",
        )
    
    # Atomically check and decrement quota
    quota_available = await crud.check_and_decrement_quota(
        session=session,
        b2b_user_id=request.b2b_user_id,
        quantity=1,
    )
    if not quota_available:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient quota. Monthly quota: {subscription.monthly_quota}, "
                   f"Used: {subscription.used_quota}",
        )
    
    # Create LoadRequest with priority flag
    load_request = await crud.create_load_request(
        session=session,
        customer_id=request.b2b_user_id,
        pickup_lat=request.pickup_latitude,
        pickup_lon=request.pickup_longitude,
        dropoff_lat=request.dropoff_latitude,
        dropoff_lon=request.dropoff_longitude,
        required_volume=request.required_volume,
        priority=request.priority,
    )
    
    return B2BBookResponse(
        load_request_id=load_request.id,
        status=load_request.status,
        priority=load_request.priority,
        required_volume=float(load_request.required_volume),
    )


@app.get(
    "/api/v1/places/suggest",
    response_model=PlacesSuggestResponse,
    tags=["Places"],
    summary="Get destination suggestions via Gemini",
)
async def suggest_places(q: str = "") -> PlacesSuggestResponse:
    if not q or len(q) < 3:
        return PlacesSuggestResponse(suggestions=[])
        
    api_key = os.getenv("GEMINI_API_KEY", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    prompt = f"The user searched for a location: '{q}'. Return the best matching real-world places (up to 3) with their latitude and longitude. Respond ONLY with a valid JSON array of objects. Format: [{{\"id\": \"1\", \"title\": \"Name of place\", \"description\": \"Address/Location context\", \"latitude\": 0.0, \"longitude\": 0.0}}]. Do not include markdown codeblocks."
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1}
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        import asyncio
        def fetch():
            with urllib.request.urlopen(req) as response:
                return response.read().decode('utf-8')
        
        response_text = await asyncio.to_thread(fetch)
        result = json.loads(response_text)
        text_response = result['candidates'][0]['content']['parts'][0]['text']
        
        # Robust JSON extraction
        json_match = re.search(r'\[.*\]', text_response, re.DOTALL)
        if json_match:
            text_response = json_match.group(0)
        
        places_data = json.loads(text_response)
        
        places = [
            PlaceSuggestion(
                id=str(p.get('id', i)),
                title=str(p.get('title', 'Unknown')),
                description=str(p.get('description', '')),
                latitude=float(p.get('latitude', 0.0)),
                longitude=float(p.get('longitude', 0.0))
            ) for i, p in enumerate(places_data)
        ]
        return PlacesSuggestResponse(suggestions=places)
    except Exception as e:
        print(f"Gemini API suggest error: {e}")
        return PlacesSuggestResponse(suggestions=[])

@app.get(
    "/api/v1/places/reverse",
    response_model=ReverseGeocodeResponse,
    tags=["Places"],
    summary="Reverse geocode coordinates via Gemini",
)
async def reverse_geocode(lat: float, lon: float) -> ReverseGeocodeResponse:
    api_key = os.getenv("GEMINI_API_KEY", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    prompt = f"Reverse geocode this coordinate: latitude {lat}, longitude {lon}. Identify the real-world street, neighborhood, or landmark near it. Respond ONLY with a valid JSON object with two keys: title (a short name like street or landmark) and description (full city/region context). No markdown."
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1}
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        import asyncio
        def fetch():
            with urllib.request.urlopen(req) as response:
                return response.read().decode('utf-8')
        
        response_text = await asyncio.to_thread(fetch)
        result = json.loads(response_text)
        text_response = result['candidates'][0]['content']['parts'][0]['text']
        
        # Robust JSON extraction
        json_match = re.search(r'\{.*\}', text_response, re.DOTALL)
        if json_match:
            text_response = json_match.group(0)
            
        place_data = json.loads(text_response)
        
        return ReverseGeocodeResponse(
            title=str(place_data.get('title', 'Dropped Pin')),
            description=str(place_data.get('description', 'Unknown Location'))
        )
    except Exception as e:
        print(f"Gemini API reverse geocode error: {e}")
        return ReverseGeocodeResponse(title="Dropped Pin", description=f"{lat:.4f}, {lon:.4f}")


@app.post(
    "/api/v1/prices/estimate",
    response_model=PriceEstimateResponse,
    tags=["Prices"],
    summary="Estimate ride price",
)
async def estimate_price(request: PriceEstimateRequest) -> PriceEstimateResponse:
    # Proper Haversine distance calculation
    R = 6371.0  # Earth's radius in km
    lat1 = math.radians(request.pickup_latitude)
    lat2 = math.radians(request.dropoff_latitude)
    dlat = math.radians(request.dropoff_latitude - request.pickup_latitude)
    dlon = math.radians(request.dropoff_longitude - request.pickup_longitude)
    
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance_km = R * c
    
    # Realistic Indian ride pricing
    base_price = 50.0   # Base fare in INR
    per_km_rate = 12.0   # Per km rate in INR
    calculated_price = round(base_price + distance_km * per_km_rate)
    
    # Minimum fare
    calculated_price = max(calculated_price, 80)
    
    if request.ride_mode == "sahiyatri":
        calculated_price = round(calculated_price * 0.6)

    return PriceEstimateResponse(estimated_price=float(calculated_price))


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error_type": exc.__class__.__name__,
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
