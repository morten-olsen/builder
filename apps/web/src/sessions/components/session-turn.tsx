import { useState } from 'react';

import type { SessionEventEntry } from '../use-session-events.js';
import { SessionEventItem } from './session-event-item.js';
import { AssistantMessage } from './assistant-message.js';

type TurnData = {
  events: SessionEventEntry[];
  finalOutput: SessionEventEntry | null;
  completionEvent: SessionEventEntry | null;
  snapshotMessageId?: string;
};

type SessionTurnProps = {
  turn: TurnData;
  onRevert?: (messageId: string) => void;
  isReverting?: boolean;
};

const countToolCalls = (events: SessionEventEntry[]): number =>
  events.filter((e) => e.type === 'agent:tool_use').length;

const SessionTurn = ({ turn, onRevert, isReverting }: SessionTurnProps): React.ReactNode => {
  const [expanded, setExpanded] = useState(false);

  const { events, finalOutput, completionEvent, snapshotMessageId } = turn;

  // Intermediate events = everything except the final output and the completion event
  const intermediateEvents = events.filter(
    (e) => e !== finalOutput && e !== completionEvent,
  );

  const toolCalls = countToolCalls(intermediateEvents);
  const totalIntermediate = intermediateEvents.length;

  return (
    <div>
      {/* Collapsible intermediate events */}
      {totalIntermediate > 0 && (
        <div className="mb-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 rounded px-2 py-1 font-mono text-ui text-text-muted transition-colors hover:bg-surface-2 hover:text-text-dim"
          >
            <svg
              className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M4.5 2l4 4-4 4V2z" />
            </svg>
            <span>
              {totalIntermediate} event{totalIntermediate !== 1 ? 's' : ''}
              {toolCalls > 0 && ` · ${toolCalls} tool call${toolCalls !== 1 ? 's' : ''}`}
            </span>
          </button>

          {expanded && (
            <div className="mt-1 space-y-1 border-l border-border-dim pl-3">
              {intermediateEvents.map((event) => (
                <SessionEventItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Final assistant output — always visible */}
      {finalOutput && (
        <AssistantMessage
          text={String((finalOutput.data as Record<string, unknown>).text ?? '')}
        />
      )}

      {/* Completion / error alert */}
      {completionEvent && (
        <SessionEventItem
          event={completionEvent}
          snapshotMessageId={snapshotMessageId}
          onRevert={onRevert}
          isReverting={isReverting}
        />
      )}
    </div>
  );
};

export type { TurnData };
export { SessionTurn };
