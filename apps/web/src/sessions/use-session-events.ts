import { useCallback, useEffect, useRef, useState } from 'react';

import { getClient } from '../client/client.js';
import type { SequencedSessionEvent } from '@morten-olsen/builder-client';

type SessionEventEntry = SequencedSessionEvent & {
  id: number;
};

type UseSessionEventsResult = {
  events: SessionEventEntry[];
  isSynced: boolean;
  isConnected: boolean;
  reset: () => void;
};

const useSessionEvents = (sessionId: string): UseSessionEventsResult => {
  const [events, setEvents] = useState<SessionEventEntry[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const lastSequenceRef = useRef<number>(0);
  const entryIdRef = useRef(0);
  const seenSequencesRef = useRef(new Set<number>());
  const abortRef = useRef<AbortController | null>(null);

  const connect = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsConnected(true);

    const afterSequence = lastSequenceRef.current > 0 ? lastSequenceRef.current : undefined;

    getClient()
      .streamEvents(
        sessionId,
        (event) => {
          if (controller.signal.aborted) return;

          const sequence = event.sequence;

          if (event.type === 'sync') {
            setIsSynced(true);
            return;
          }

          if (sequence !== undefined) {
            if (seenSequencesRef.current.has(sequence)) return;
            seenSequencesRef.current.add(sequence);
            lastSequenceRef.current = Math.max(lastSequenceRef.current, sequence);
          }

          const entry: SessionEventEntry = {
            ...event,
            id: entryIdRef.current++,
          };

          setEvents((prev) => [...prev, entry]);
        },
        { afterSequence },
      )
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsConnected(false);
        }
      });
  }, [sessionId]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setEvents([]);
    setIsSynced(false);
    setIsConnected(false);
    lastSequenceRef.current = 0;
    entryIdRef.current = 0;
    seenSequencesRef.current = new Set();
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      abortRef.current?.abort();
    };
  }, [connect]);

  return { events, isSynced, isConnected, reset };
};

export type { SessionEventEntry };
export { useSessionEvents };
