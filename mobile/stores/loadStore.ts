/**
 * LoadKaro Load Store (Zustand)
 * Manages load requests, booking state, and SahiYatri pooling
 */

import { create } from 'zustand';
import type { LoadRequest, GeoPoint, RideMode } from '../lib/types';

interface LoadState {
  // Map / booking flow
  pickup: GeoPoint | null;
  dropoff: GeoPoint | null;
  pickupAddress: string;
  dropoffAddress: string;
  rideMode: RideMode;
  estimatedPrice: number | null;
  poolDiscount: number | null;
  estimatedVolume: number | null;

  // Active loads
  activeLoads: LoadRequest[];
  currentLoad: LoadRequest | null;

  // Actions
  setPickup: (point: GeoPoint, address?: string) => void;
  setDropoff: (point: GeoPoint, address?: string) => void;
  setRideMode: (mode: RideMode) => void;
  setEstimatedPrice: (price: number) => void;
  setEstimatedVolume: (volume: number) => void;
  setActiveLoads: (loads: LoadRequest[]) => void;
  setCurrentLoad: (load: LoadRequest | null) => void;
  addLoad: (load: LoadRequest) => void;
  updateLoadStatus: (loadId: string, status: LoadRequest['status']) => void;
  resetBooking: () => void;
}

export const useLoadStore = create<LoadState>((set, get) => ({
  pickup: null,
  dropoff: null,
  pickupAddress: '',
  dropoffAddress: '',
  rideMode: 'solo',
  estimatedPrice: null,
  poolDiscount: null,
  estimatedVolume: null,

  activeLoads: [],
  currentLoad: null,

  setPickup: (point, address = '') =>
    set({ pickup: point, pickupAddress: address }),

  setDropoff: (point, address = '') =>
    set({ dropoff: point, dropoffAddress: address }),

  setRideMode: (mode) =>
    set({
      rideMode: mode,
      poolDiscount: mode === 'sahiyatri' ? 40 : null,
    }),

  setEstimatedPrice: (price) => {
    const { rideMode } = get();
    set({
      estimatedPrice: price,
      poolDiscount: rideMode === 'sahiyatri' ? Math.round(price * 0.4) : null,
    });
  },

  setEstimatedVolume: (volume) => set({ estimatedVolume: volume }),

  setActiveLoads: (loads) => set({ activeLoads: loads }),

  setCurrentLoad: (load) => set({ currentLoad: load }),

  addLoad: (load) =>
    set((state) => ({ activeLoads: [load, ...state.activeLoads] })),

  updateLoadStatus: (loadId, status) =>
    set((state) => ({
      activeLoads: state.activeLoads.map((l) =>
        l.id === loadId ? { ...l, status } : l
      ),
    })),

  resetBooking: () =>
    set({
      pickup: null,
      dropoff: null,
      pickupAddress: '',
      dropoffAddress: '',
      rideMode: 'solo',
      estimatedPrice: null,
      poolDiscount: null,
      estimatedVolume: null,
    }),
}));
