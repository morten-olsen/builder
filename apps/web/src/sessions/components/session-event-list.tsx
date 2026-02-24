import { useEffect, useMemo, useRef } from 'react';

import type { SessionEventEntry } from '../use-session-events.js';
import { SessionEventItem } from './session-event-item.js';
import { SessionTurn, type TurnData } from './session-turn.js';

type SessionEventListProps = {
  events: SessionEventEntry[];
  isSynced: boolean;
  isLoading: boolean;
  status?: string;
  onRevert?: (messageId: string) => void;
  isReverting?: boolean;
};

type TurnGroup = {
  type: 'completed';
  turn: TurnData;
  key: number;
} | {
  type: 'live';
  events: SessionEventEntry[];
  key: number;
};

const groupIntoTurns = (events: SessionEventEntry[]): TurnGroup[] => {
  const groups: TurnGroup[] = [];
  let current: SessionEventEntry[] = [];
  let latestSnapshotMessageId: string | undefined;

  const flushCompleted = (completionEvent: SessionEventEntry): void => {
    // Find the last agent:output (assistant) in this turn as the "final output"
    let finalOutput: SessionEventEntry | null = null;
    for (let i = current.length - 1; i >= 0; i--) {
      const e = current[i];
      if (e.type === 'agent:output') {
        finalOutput = e;
        break;
      }
    }

    groups.push({
      type: 'completed',
      key: completionEvent.id,
      turn: {
        events: current,
        finalOutput,
        completionEvent,
        snapshotMessageId: latestSnapshotMessageId,
      },
    });

    current = [];
    latestSnapshotMessageId = undefined;
  };

  for (const event of events) {
    if (event.type === 'session:snapshot') {
      const d = event.data as { messageId?: string };
      if (d.messageId) latestSnapshotMessageId = d.messageId;
      current.push(event);
    } else if (event.type === 'session:completed' || event.type === 'session:error') {
      current.push(event);
      flushCompleted(event);
    } else {
      current.push(event);
    }
  }

  // Remaining events form the active/live turn
  if (current.length > 0) {
    groups.push({
      type: 'live',
      events: current,
      key: current[0].id,
    });
  }

  return groups;
};

const SessionEventList = ({
  events,
  isSynced,
  isLoading,
  status,
  onRevert,
  isReverting,
}: SessionEventListProps): React.ReactNode => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 80;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const groups = useMemo(() => groupIntoTurns(events), [events]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-surface-0 p-3">
      {!isSynced && !isLoading && (
        <div className="py-12 text-center font-mono text-xs text-text-muted">connecting...</div>
      )}
      {isSynced && events.length === 0 && (
        <div className="py-12 text-center font-mono text-xs text-text-muted">
          {status === 'running' ? 'waiting for events...' : 'no events recorded'}
        </div>
      )}
      <div className="space-y-2">
        {groups.map((group) =>
          group.type === 'completed' ? (
            <SessionTurn
              key={group.key}
              turn={group.turn}
              onRevert={onRevert}
              isReverting={isReverting}
            />
          ) : (
            <div key={group.key} className="space-y-1">
              {group.events.map((event) => (
                <SessionEventItem key={event.id} event={event} />
              ))}
            </div>
          ),
        )}
      </div>
      <div ref={endRef} />
    </div>
  );
};

export { SessionEventList };
