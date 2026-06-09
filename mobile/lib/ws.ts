/**
 * LoadKaro WebSocket Manager
 * Handles connection, auto-reconnect with exponential backoff, and message routing
 */

import { WS_BASE_URL, WS_ENDPOINTS } from './constants';
import type { WSMessage, WSMessageType } from './types';

type MessageHandler = (message: WSMessage) => void;

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_MULTIPLIER = 2;

class LoadWSManager {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<WSMessageType, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<(msg: WSMessage) => void> = new Set();
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private _isConnected = false;

  // Callbacks for connection state changes
  onConnectionChange?: (connected: boolean) => void;
  onReconnecting?: (attempt: number) => void;
  private reconnectAttempt = 0;

  constructor(endpoint: string = WS_ENDPOINTS.loads) {
    this.url = `${WS_BASE_URL}${endpoint}`;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    const url = token ? `${this.url}?token=${token}` : this.url;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Connected to', this.url);
        this._isConnected = true;
        this.reconnectDelay = INITIAL_RECONNECT_DELAY;
        this.reconnectAttempt = 0;
        this.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.dispatch(message);
        } catch (err) {
          console.warn('[WS] Failed to parse message:', err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log('[WS] Connection closed:', event.code, event.reason);
        this._isConnected = false;
        this.onConnectionChange?.(false);

        if (!this.intentionalClose) {
          this.scheduleReconnect(token);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('[WS] Error:', error);
        // onclose will fire after onerror, so reconnect is handled there
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      this.scheduleReconnect(token);
    }
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this._isConnected = false;
    this.onConnectionChange?.(false);
  }

  private scheduleReconnect(token?: string): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectAttempt++;
    this.onReconnecting?.(this.reconnectAttempt);

    console.log(
      `[WS] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempt})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect(token);
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * RECONNECT_MULTIPLIER,
      MAX_RECONNECT_DELAY
    );
  }

  // ─── Event Handling ────────────────────────────────────────────

  on(type: WSMessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  onAny(handler: (msg: WSMessage) => void): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  private dispatch(message: WSMessage): void {
    // Global handlers
    this.globalHandlers.forEach((handler) => handler(message));

    // Type-specific handlers
    const typeHandlers = this.handlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => handler(message));
    }
  }

  // ─── Send Messages ────────────────────────────────────────────

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          payload,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      console.warn('[WS] Cannot send — not connected');
    }
  }

  sendBid(loadRequestId: string, amount: number): void {
    this.send('place_bid', {
      load_request_id: loadRequestId,
      amount,
    });
  }

  acceptBid(bidId: string): void {
    this.send('accept_bid', {
      bid_id: bidId,
    });
  }
}

// Singleton instances for different WS channels
export const loadsWS = new LoadWSManager(WS_ENDPOINTS.loads);
export const bidsWS = new LoadWSManager(WS_ENDPOINTS.bids);

export { LoadWSManager };
export default loadsWS;
