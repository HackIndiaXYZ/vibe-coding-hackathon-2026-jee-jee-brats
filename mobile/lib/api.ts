/**
 * LoadKaro REST API Client
 * Fetch wrapper for backend FastAPI endpoints
 */

import { API_BASE_URL, API_ENDPOINTS } from './constants';
import type {
  NearbyDriversResponse,
  CargoLaneMatchResponse,
  B2BBookResponse,
  ApiError,
} from './types';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `Request failed with status ${response.status}`,
      }));
      throw new Error(error.detail);
    }

    return response.json();
  }

  // ─── Health ──────────────────────────────────────────────────

  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request(API_ENDPOINTS.health);
  }

  // ─── Drivers ─────────────────────────────────────────────────

  async getNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<NearbyDriversResponse> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius_km: radiusKm.toString(),
    });
    return this.request(`${API_ENDPOINTS.nearbyDrivers}?${params}`);
  }

  // ─── Cargo Lanes ─────────────────────────────────────────────

  async matchCargoLane(
    pickupLat: number,
    pickupLon: number,
    dropoffLat: number,
    dropoffLon: number
  ): Promise<CargoLaneMatchResponse> {
    return this.request(API_ENDPOINTS.cargoLaneMatch, {
      method: 'POST',
      body: JSON.stringify({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLon,
        dropoff_latitude: dropoffLat,
        dropoff_longitude: dropoffLon,
      }),
    });
  }

  // ─── B2B Booking ──────────────────────────────────────────────

  async b2bBook(
    b2bUserId: string,
    pickupLat: number,
    pickupLon: number,
    dropoffLat: number,
    dropoffLon: number,
    requiredVolume: number,
    priority: boolean = true
  ): Promise<B2BBookResponse> {
    return this.request(API_ENDPOINTS.b2bBook, {
      method: 'POST',
      body: JSON.stringify({
        b2b_user_id: b2bUserId,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLon,
        dropoff_latitude: dropoffLat,
        dropoff_longitude: dropoffLon,
        required_volume: requiredVolume,
        priority,
      }),
    });
  }

  // ─── Auth (Placeholder — implement when backend adds auth) ───

  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(name: string, email: string, password: string, role: string) {
    return this.request<{ user: any; token: string }>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
