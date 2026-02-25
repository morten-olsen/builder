import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SequencedSessionEvent, WebSocketConnection } from '@morten-olsen/builder-client';

import { getClient } from '../client/client.js';

type SessionEventEntry = SequencedSessionEvent & {
  id: number;
};

type EventStreamContextValue = {
  subscribeSession: (sessionId: string) => void;
  unsubscribeSession: (sessionId: string) => void;
  sessionEvents: SessionEventEntry[];
  isSynced: boolean;
  isConnected: boolean;
  resetSession: () => void;
};

const EventStreamContext = createContext<EventStreamContextValue | null>(null);

type EventStreamProviderProps = {
  children: React.ReactNode;
};

const RECONNECT_DELAY = 2000;

const EventStreamProvider = ({ children }: EventStreamProviderProps): React.ReactNode => {
  const queryClient = useQueryClient();
  const [sessionEvents, setSessionEvents] = useState<SessionEventEntry[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocketConnection | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  const lastSequenceRef = useRef<number>(0);
  const entryIdRef = useRef(0);
  const seenSequencesRef = useRef(new Set<number>());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearReconnectTimer = useCallback((): void => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const resetSessionState = useCallback((): void => {
    setSessionEvents([]);
    setIsSynced(false);
    lastSequenceRef.current = 0;
    entryIdRef.current = 0;
    seenSequencesRef.current = new Set();
  }, []);

  const connect = useCallback((): void => {
    wsRef.current?.close();
    clearReconnectTimer();

    const ws = getClient().connectWebSocket({
      onSessionEvent: (sessionId, event) => {
        if (sessionId !== activeSessionRef.current) return;

        const sequence = event.sequence;
        if (sequence !== undefined) {
          if (seenSequencesRef.current.has(sequence)) return;
          seenSequencesRef.current.add(sequence);
          lastSequenceRef.current = Math.max(lastSequenceRef.current, sequence);
        }

        const entry: SessionEventEntry = {
          ...event,
          id: entryIdRef.current++,
        };

        setSessionEvents((prev) => [...prev, entry]);
      },
      onUserEvent: (event) => {
        if (event.type === 'session:updated') {
          void queryClient.invalidateQueries({ queryKey: ['sessions'] });
          void queryClient.invalidateQueries({
            queryKey: ['sessions', event.data.sessionId],
          });
        }
      },
      onSync: (sessionId) => {
        if (sessionId !== activeSessionRef.current) return;
        setIsSynced(true);
      },
      onOpen: () => {
        setIsConnected(true);
        // Re-subscribe to active session after reconnect
        const sessionId = activeSessionRef.current;
        if (sessionId) {
          ws.subscribe(sessionId, lastSequenceRef.current > 0 ? lastSequenceRef.current : undefined);
        }
      },
      onClose: () => {
        setIsConnected(false);
        if (mountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      },
    });

    wsRef.current = ws;
  }, [queryClient, clearReconnectTimer]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, clearReconnectTimer]);

  const subscribeSession = useCallback((sessionId: string): void => {
    activeSessionRef.current = sessionId;
    resetSessionState();
    wsRef.current?.subscribe(sessionId, 0);
  }, [resetSessionState]);

  const unsubscribeSession = useCallback((sessionId: string): void => {
    wsRef.current?.unsubscribe(sessionId);
    if (activeSessionRef.current === sessionId) {
      activeSessionRef.current = null;
      resetSessionState();
    }
  }, [resetSessionState]);

  const resetSession = useCallback((): void => {
    const sessionId = activeSessionRef.current;
    if (!sessionId) return;
    resetSessionState();
    wsRef.current?.subscribe(sessionId, 0);
  }, [resetSessionState]);

  return (
    <EventStreamContext.Provider
      value={{
        subscribeSession,
        unsubscribeSession,
        sessionEvents,
        isSynced,
        isConnected,
        resetSession,
      }}
    >
      {children}
    </EventStreamContext.Provider>
  );
};

const useEventStream = (): EventStreamContextValue => {
  const ctx = useContext(EventStreamContext);
  if (!ctx) throw new Error('useEventStream must be used within EventStreamProvider');
  return ctx;
};

export type { SessionEventEntry, EventStreamContextValue };
export { EventStreamProvider, useEventStream };
