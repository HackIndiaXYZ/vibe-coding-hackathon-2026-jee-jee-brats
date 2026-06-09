/**
 * LoadKaro TypeScript Interfaces
 * Aligned with backend models (models.py / schemas.py)
 */

// ─── Enums ──────────────────────────────────────────────────────

export type UserRole = 'customer' | 'driver' | 'b2b_partner';

export type LoadRequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export type VehicleVerificationStatus = 'pending' | 'verified' | 'rejected';

export type RideMode = 'solo' | 'sahiyatri';

// ─── Core Models ────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  type: string;
  capacity_volume: number;
  license_plate: string;
  verification_status: VehicleVerificationStatus;
  photo_url?: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LoadRequest {
  id: string;
  customer_id: string;
  driver_id?: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  status: LoadRequestStatus;
  required_volume: number;
  priority: boolean;
  created_at: string;
  // Computed fields for display
  distance_km?: number;
  estimated_price?: number;
  pickup_address?: string;
  dropoff_address?: string;
}

export interface Bid {
  id: string;
  load_request_id: string;
  driver_id: string;
  driver_name: string;
  driver_rating: number;
  vehicle_type: string;
  vehicle_photo_url?: string;
  amount: number;
  created_at: string;
}

export interface CargoLaneMatch {
  fixed_price: number | null;
  cargo_lane_id: string | null;
}

// ─── WebSocket Message Types ────────────────────────────────────

export type WSMessageType =
  | 'new_load'
  | 'load_cancelled'
  | 'new_bid'
  | 'bid_accepted'
  | 'auction_closed'
  | 'connection_ack'
  | 'error';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
}

export interface WSNewLoadPayload {
  load_id: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  distance_km: number;
  max_payout: number;
  required_volume: number;
  pickup_address: string;
  dropoff_address: string;
  auction_ends_at: string;
}

export interface WSNewBidPayload {
  bid: Bid;
}

export interface WSBidAcceptedPayload {
  load_request_id: string;
  accepted_bid_id: string;
  driver_id: string;
}

// ─── API Response Types ─────────────────────────────────────────

export interface NearbyDriversResponse {
  drivers: User[];
}

export interface CargoLaneMatchResponse {
  fixed_price: number | null;
  cargo_lane_id: string | null;
}

export interface B2BBookResponse {
  load_request_id: string;
  status: LoadRequestStatus;
  priority: boolean;
  required_volume: number;
}

export interface ApiError {
  detail: string;
}

// ─── Auth Types ─────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ─── Navigation Params ──────────────────────────────────────────

export interface AuctionParams {
  loadRequestId: string;
}
