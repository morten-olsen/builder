import { useEffect } from 'react';

import { useEventStream } from '../contexts/event-stream.js';
import type { SessionEventEntry } from '../contexts/event-stream.js';

type UseSessionEventsResult = {
  events: SessionEventEntry[];
  isSynced: boolean;
  isConnected: boolean;
  reset: () => void;
};

const useSessionEvents = (sessionId: string): UseSessionEventsResult => {
  const { subscribeSession, unsubscribeSession, sessionEvents, isSynced, isConnected, resetSession } =
    useEventStream();

  useEffect(() => {
    subscribeSession(sessionId);
    return () => unsubscribeSession(sessionId);
  }, [sessionId, subscribeSession, unsubscribeSession]);

  return { events: sessionEvents, isSynced, isConnected, reset: resetSession };
};

export type { SessionEventEntry };
export { useSessionEvents };
