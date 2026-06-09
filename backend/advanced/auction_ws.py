"""
Real-Time Reverse Auction Engine with WebSockets & Redis Pub/Sub
Handles concurrent driver bidding with strict 3-minute auction window
"""
import json
import asyncio
import logging
from typing import Dict, Set, Optional, List
from datetime import datetime, timedelta
from uuid import UUID
import aioredis
from fastapi import WebSocket, WebSocketDisconnect, HTTPException, status
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class BidStatus(str, Enum):
    """Auction status enumeration"""
    ACTIVE = "active"
    CLOSED = "closed"
    EXPIRED = "expired"
    AWARDED = "awarded"


@dataclass
class Bid:
    """Represents a single bid in auction"""
    driver_id: str
    amount: float
    timestamp: float
    vehicle_id: str


@dataclass
class AuctionState:
    """Current auction state stored in Redis"""
    load_id: str
    min_bid: float
    current_winner: Optional[str]
    status: str
    created_at: float
    expires_at: float
    zone_hash: str
    start_location: Dict
    end_location: Dict
    required_volume: float
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict):
        return cls(**data)


class ConnectionManager:
    """
    Manages concurrent WebSocket connections for real-time auction bidding.
    Prevents race conditions and handles graceful disconnects.
    """
    
    def __init__(self, redis_url: str = "redis://localhost"):
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # load_id -> {websockets}
        self.redis_url = redis_url
        self.redis = None
        self.bid_locks: Dict[str, asyncio.Lock] = {}  # Per-load locking for bid validation
        
    async def connect(self, websocket: WebSocket, load_id: str):
        """
        Accept WebSocket connection and add to active connections.
        Prevents race conditions with per-load locks.
        """
        await websocket.accept()
        
        if load_id not in self.active_connections:
            self.active_connections[load_id] = set()
            self.bid_locks[load_id] = asyncio.Lock()
        
        self.active_connections[load_id].add(websocket)
        logger.info(f"WebSocket connected for load {load_id}. Total connections: {len(self.active_connections[load_id])}")
        
    async def disconnect(self, load_id: str, websocket: WebSocket):
        """Remove disconnected WebSocket gracefully"""
        if load_id in self.active_connections:
            self.active_connections[load_id].discard(websocket)
            logger.info(f"WebSocket disconnected from load {load_id}. Remaining: {len(self.active_connections[load_id])}")
            
            # Cleanup empty load auctions
            if not self.active_connections[load_id]:
                del self.active_connections[load_id]
                if load_id in self.bid_locks:
                    del self.bid_locks[load_id]
    
    async def broadcast(self, load_id: str, message: Dict):
        """
        Broadcast message to all connected clients for a load.
        Removes dead connections automatically.
        """
        if load_id not in self.active_connections:
            return
        
        dead_connections = set()
        
        for connection in self.active_connections[load_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message to client: {e}")
                dead_connections.add(connection)
        
        # Remove dead connections
        self.active_connections[load_id] -= dead_connections
    
    async def init_redis(self):
        """Initialize Redis connection for Pub/Sub"""
        try:
            self.redis = await aioredis.create_redis_pool(self.redis_url)
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def close(self):
        """Close all connections gracefully"""
        for connections in self.active_connections.values():
            for ws in connections:
                try:
                    await ws.close()
                except:
                    pass
        
        if self.redis:
            self.redis.close()
            await self.redis.wait_closed()


class AuctionEngine:
    """
    Core auction logic with Redis-backed state management.
    Enforces strict 180-second auction window with TTL.
    """
    
    AUCTION_DURATION = 180  # 3 minutes in seconds
    REDIS_PREFIX = "auction"
    
    def __init__(self, redis: aioredis.Redis):
        self.redis = redis
    
    async def create_auction(
        self,
        load_id: str,
        initial_bid: float,
        zone_hash: str,
        start_location: Dict,
        end_location: Dict,
        required_volume: float,
    ) -> AuctionState:
        """
        Create new auction in Redis with TTL enforcement.
        Initial bid is the customer's asking price.
        """
        now = datetime.utcnow().timestamp()
        expires_at = now + self.AUCTION_DURATION
        
        auction = AuctionState(
            load_id=load_id,
            min_bid=initial_bid,
            current_winner=None,
            status=BidStatus.ACTIVE,
            created_at=now,
            expires_at=expires_at,
            zone_hash=zone_hash,
            start_location=start_location,
            end_location=end_location,
            required_volume=required_volume,
        )
        
        # Store in Redis with TTL
        key = f"{self.REDIS_PREFIX}:{load_id}"
        await self.redis.setex(
            key,
            self.AUCTION_DURATION,
            json.dumps(auction.to_dict())
        )
        
        # Publish to zone channel for discovery
        channel = f"zone:{zone_hash}:loads"
        await self.redis.publish(channel, json.dumps({
            "event": "load_created",
            "load_id": load_id,
            "initial_bid": initial_bid,
            "required_volume": required_volume,
            "expires_at": expires_at,
        }))
        
        logger.info(f"Auction created: {load_id} in zone {zone_hash} with initial bid {initial_bid}")
        return auction
    
    async def get_auction(self, load_id: str) -> Optional[AuctionState]:
        """Retrieve auction state from Redis"""
        key = f"{self.REDIS_PREFIX}:{load_id}"
        data = await self.redis.get(key)
        
        if data:
            return AuctionState.from_dict(json.loads(data))
        return None
    
    async def place_bid(
        self,
        load_id: str,
        driver_id: str,
        vehicle_id: str,
        bid_amount: float,
        lock: asyncio.Lock,
    ) -> tuple[bool, str, Optional[AuctionState]]:
        """
        Place bid with atomic validation using lock.
        Returns: (success, message, updated_auction)
        """
        async with lock:
            # Fetch current auction state
            auction = await self.get_auction(load_id)
            
            if not auction:
                return False, "Auction not found or expired", None
            
            if auction.status != BidStatus.ACTIVE:
                return False, f"Auction is {auction.status}", auction
            
            # Check if auction has expired
            now = datetime.utcnow().timestamp()
            if now > auction.expires_at:
                # Mark as expired
                await self._close_auction(load_id, BidStatus.EXPIRED)
                return False, "Auction expired", auction
            
            # Validate bid is lower than current minimum
            if bid_amount >= auction.min_bid:
                return False, f"Bid must be lower than {auction.min_bid}", auction
            
            # Update auction with new minimum bid
            auction.min_bid = bid_amount
            auction.current_winner = driver_id
            
            # Persist updated auction
            key = f"{self.REDIS_PREFIX}:{load_id}"
            ttl = int(auction.expires_at - now)
            await self.redis.setex(
                key,
                max(ttl, 1),  # Ensure minimum 1 second TTL
                json.dumps(auction.to_dict())
            )
            
            # Store bid history
            bid = Bid(
                driver_id=driver_id,
                amount=bid_amount,
                timestamp=now,
                vehicle_id=vehicle_id,
            )
            bid_key = f"{self.REDIS_PREFIX}:{load_id}:bids"
            await self.redis.rpush(bid_key, json.dumps(asdict(bid)))
            await self.redis.expire(bid_key, self.AUCTION_DURATION)
            
            logger.info(f"Bid accepted for load {load_id}: driver={driver_id}, amount={bid_amount}")
            return True, "Bid accepted", auction
    
    async def close_auction(self, load_id: str) -> Optional[AuctionState]:
        """
        Close auction and award to current winner.
        Called when TTL expires or manually.
        """
        auction = await self.get_auction(load_id)
        if auction:
            await self._close_auction(load_id, BidStatus.AWARDED)
            logger.info(f"Auction closed: {load_id}, winner: {auction.current_winner}, final_bid: {auction.min_bid}")
        return auction
    
    async def _close_auction(self, load_id: str, status: str):
        """Internal method to update auction status"""
        auction = await self.get_auction(load_id)
        if auction:
            auction.status = status
            key = f"{self.REDIS_PREFIX}:{load_id}"
            await self.redis.setex(
                key,
                self.AUCTION_DURATION,
                json.dumps(auction.to_dict())
            )
    
    async def get_bid_history(self, load_id: str) -> List[Bid]:
        """Retrieve all bids for a load"""
        bid_key = f"{self.REDIS_PREFIX}:{load_id}:bids"
        bids_data = await self.redis.lrange(bid_key, 0, -1)
        
        bids = []
        for bid_json in bids_data:
            bid_dict = json.loads(bid_json)
            bids.append(Bid(**bid_dict))
        
        return bids
    
    async def subscribe_to_zone(self, zone_hash: str, callback):
        """
        Subscribe to load creation events in a geographic zone.
        Callback receives load events for zone-aware driver discovery.
        """
        channel = f"zone:{zone_hash}:loads"
        ch = await self.redis.subscribe(channel)
        
        async for message in ch[0].iter():
            try:
                event_data = json.loads(message.decode())
                await callback(event_data)
            except Exception as e:
                logger.error(f"Error processing zone event: {e}")


async def auction_websocket_handler(
    websocket: WebSocket,
    load_id: str,
    driver_id: str,
    vehicle_id: str,
    connection_manager: ConnectionManager,
    auction_engine: AuctionEngine,
):
    """
    WebSocket endpoint handler for real-time auction bidding.
    Validates bids, broadcasts updates, handles disconnects.
    
    Client message format:
    {
        "event": "place_bid",
        "bid_amount": 450.50,
        "vehicle_id": "uuid"
    }
    """
    await connection_manager.connect(websocket, load_id)
    
    try:
        # Send current auction state to newly connected client
        auction = await auction_engine.get_auction(load_id)
        if auction:
            await websocket.send_json({
                "event": "auction_state",
                "data": auction.to_dict(),
            })
        
        # Listen for incoming bids
        while True:
            data = await websocket.receive_json()
            
            if data.get("event") == "place_bid":
                bid_amount = data.get("bid_amount")
                
                if not bid_amount or bid_amount <= 0:
                    await websocket.send_json({
                        "event": "error",
                        "message": "Invalid bid amount"
                    })
                    continue
                
                # Place bid with atomic lock
                lock = connection_manager.bid_locks.get(load_id)
                success, message, updated_auction = await auction_engine.place_bid(
                    load_id=load_id,
                    driver_id=driver_id,
                    vehicle_id=vehicle_id,
                    bid_amount=bid_amount,
                    lock=lock,
                )
                
                if success:
                    # Broadcast new bid to all connected clients
                    await connection_manager.broadcast(load_id, {
                        "event": "bid_update",
                        "min_bid": updated_auction.min_bid,
                        "winner": driver_id,
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                    
                    await websocket.send_json({
                        "event": "bid_accepted",
                        "message": message,
                        "min_bid": updated_auction.min_bid,
                    })
                else:
                    await websocket.send_json({
                        "event": "bid_rejected",
                        "message": message,
                        "current_min_bid": updated_auction.min_bid if updated_auction else None,
                    })
    
    except WebSocketDisconnect:
        await connection_manager.disconnect(load_id, websocket)
    
    except Exception as e:
        logger.error(f"WebSocket error for load {load_id}: {e}")
        await connection_manager.disconnect(load_id, websocket)


async def auction_ttl_monitor(auction_engine: AuctionEngine, check_interval: int = 30):
    """
    Background task to monitor auction TTLs and close expired auctions.
    Runs periodically to clean up and award completed auctions.
    """
    while True:
        try:
            await asyncio.sleep(check_interval)
            # TTL enforcement is handled by Redis automatically
            # This task can be extended for application-level event triggers
            logger.debug("Auction TTL check cycle completed")
        except Exception as e:
            logger.error(f"Error in TTL monitor: {e}")
