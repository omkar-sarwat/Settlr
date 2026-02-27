/**
 * useWebSocket — Real-time transaction updates via WebSocket
 * 
 * Automatically connects when component mounts.
 * Listens for transaction events and updates React Query cache.
 * Uses exponential backoff for reconnection (1s → 2s → 4s → ... max 30s).
 * Stops retrying after 10 consecutive failures to avoid console spam.
 * Handles React StrictMode double-mount gracefully.
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Transaction } from '../types';

interface WebSocketMessage {
  type: 'transaction' | 'fraud_alert' | 'system_status';
  data: Transaction | Record<string, unknown>;
}

const MAX_RETRIES = 10;
const BASE_DELAY = 1000;   // 1 second
const MAX_DELAY = 30_000;  // 30 seconds

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retriesRef = useRef(0);
  const mountedRef = useRef(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    retriesRef.current = 0;

    function connect() {
      // Bail if component unmounted or exceeded retries
      if (!mountedRef.current || retriesRef.current >= MAX_RETRIES) {
        return;
      }

      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return; }
          retriesRef.current = 0;
          setConnected(true);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            if (message.type === 'transaction') {
              queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
              queryClient.invalidateQueries({ queryKey: ['admin-live'] });
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
            }

            if (message.type === 'fraud_alert') {
              queryClient.invalidateQueries({ queryKey: ['admin-flagged'] });
              queryClient.invalidateQueries({ queryKey: ['fraud-stats'] });
            }
          } catch {
            // Malformed WebSocket message — ignore silently
          }
        };

        ws.onerror = () => { /* onclose fires after onerror */ };

        ws.onclose = () => {
          setConnected(false);
          if (!mountedRef.current) return; // Don't reconnect after unmount

          retriesRef.current += 1;
          if (retriesRef.current >= MAX_RETRIES) {
            return;
          }

          const delay = Math.min(BASE_DELAY * 2 ** (retriesRef.current - 1), MAX_DELAY);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        wsRef.current = ws;
      } catch {
        // WebSocket connection failed — will not retry
      }
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [queryClient]);

  return { connected };
}
