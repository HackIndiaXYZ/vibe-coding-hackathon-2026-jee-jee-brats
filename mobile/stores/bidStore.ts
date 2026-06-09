/**
 * LoadKaro Bid Store (Zustand)
 * Manages bidding state for both customer (viewing bids) and driver (placing bids)
 */

import { create } from 'zustand';
import type { Bid, WSNewLoadPayload } from '../lib/types';

interface BidState {
  // Customer side — incoming bids on their load
  incomingBids: Bid[];
  acceptedBid: Bid | null;
  auctionEndsAt: string | null;

  // Driver side — available loads on radar
  availableLoads: WSNewLoadPayload[];
  currentBidAmount: number;
  selectedLoadId: string | null;
  isBidding: boolean;

  // Connection state
  isConnected: boolean;
  reconnectAttempt: number;

  // ─── Customer Actions ─────────────────────────────────────────
  addIncomingBid: (bid: Bid) => void;
  setAcceptedBid: (bid: Bid) => void;
  setAuctionEndsAt: (timestamp: string) => void;
  clearAuction: () => void;

  // ─── Driver Actions ───────────────────────────────────────────
  addAvailableLoad: (load: WSNewLoadPayload) => void;
  removeLoad: (loadId: string) => void;
  setSelectedLoad: (loadId: string | null) => void;
  setBidAmount: (amount: number) => void;
  incrementBid: (step: number) => void;
  decrementBid: (step: number, min: number) => void;
  setIsBidding: (val: boolean) => void;
  clearAvailableLoads: () => void;

  // ─── Connection Actions ───────────────────────────────────────
  setConnected: (connected: boolean) => void;
  setReconnectAttempt: (attempt: number) => void;
}

export const useBidStore = create<BidState>((set, get) => ({
  // Customer state
  incomingBids: [],
  acceptedBid: null,
  auctionEndsAt: null,

  // Driver state
  availableLoads: [],
  currentBidAmount: 500,
  selectedLoadId: null,
  isBidding: false,

  // Connection
  isConnected: false,
  reconnectAttempt: 0,

  // ─── Customer Actions ─────────────────────────────────────────

  addIncomingBid: (bid) =>
    set((state) => ({
      incomingBids: [bid, ...state.incomingBids],
    })),

  setAcceptedBid: (bid) => set({ acceptedBid: bid }),

  setAuctionEndsAt: (timestamp) => set({ auctionEndsAt: timestamp }),

  clearAuction: () =>
    set({
      incomingBids: [],
      acceptedBid: null,
      auctionEndsAt: null,
    }),

  // ─── Driver Actions ───────────────────────────────────────────

  addAvailableLoad: (load) =>
    set((state) => {
      // Prevent duplicates
      const exists = state.availableLoads.some((l) => l.load_id === load.load_id);
      if (exists) return state;
      return {
        availableLoads: [load, ...state.availableLoads],
        // Auto-set bid amount to 80% of max payout as starting point
        currentBidAmount:
          state.selectedLoadId === null
            ? Math.round(load.max_payout * 0.8)
            : state.currentBidAmount,
      };
    }),

  removeLoad: (loadId) =>
    set((state) => ({
      availableLoads: state.availableLoads.filter((l) => l.load_id !== loadId),
      selectedLoadId:
        state.selectedLoadId === loadId ? null : state.selectedLoadId,
    })),

  setSelectedLoad: (loadId) => {
    const load = get().availableLoads.find((l) => l.load_id === loadId);
    set({
      selectedLoadId: loadId,
      currentBidAmount: load ? Math.round(load.max_payout * 0.8) : get().currentBidAmount,
    });
  },

  setBidAmount: (amount) => set({ currentBidAmount: amount }),

  incrementBid: (step) =>
    set((state) => {
      const selectedLoad = state.availableLoads.find(
        (l) => l.load_id === state.selectedLoadId
      );
      const max = selectedLoad?.max_payout ?? Infinity;
      return {
        currentBidAmount: Math.min(state.currentBidAmount + step, max),
      };
    }),

  decrementBid: (step, min) =>
    set((state) => ({
      currentBidAmount: Math.max(state.currentBidAmount - step, min),
    })),

  setIsBidding: (val) => set({ isBidding: val }),

  clearAvailableLoads: () =>
    set({
      availableLoads: [],
      selectedLoadId: null,
    }),

  // ─── Connection ───────────────────────────────────────────────

  setConnected: (connected) => set({ isConnected: connected }),

  setReconnectAttempt: (attempt) => set({ reconnectAttempt: attempt }),
}));
