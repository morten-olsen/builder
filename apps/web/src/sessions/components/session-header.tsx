import { Link } from '@tanstack/react-router';

import { Badge } from '../../components/ui/badge.js';
import { Button } from '../../components/ui/button.js';
import { getStatusColor } from '../../utils/session.js';

type SessionHeaderProps = {
  sessionId: string;
  status?: string;
  prompt?: string;
  isRunning: boolean;
  isActive: boolean;
  onInterrupt: () => void;
  isInterrupting: boolean;
  onStop: () => void;
  isStopping: boolean;
};

type StatusBadgeColor = 'accent' | 'success' | 'danger' | 'info' | 'neutral';

const statusToBadgeColor = (status: string): StatusBadgeColor => {
  switch (status) {
    case 'running':
    case 'pending':
    case 'idle':
      return 'accent';
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'waiting_for_input':
      return 'info';
    default:
      return 'neutral';
  }
};

const SessionHeader = ({
  sessionId,
  status,
  prompt,
  isRunning,
  isActive,
  onInterrupt,
  isInterrupting,
  onStop,
  isStopping,
}: SessionHeaderProps): React.ReactNode => (
  <div className="shrink-0 border-b border-border-base bg-surface-1 px-4 py-2 lg:px-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          to="/sessions"
          className="font-mono text-xs text-text-muted hover:text-text-dim"
        >
          sessions
        </Link>
        <span className="font-mono text-xs text-text-muted">/</span>
        <span className="font-mono text-xs text-text-base">{sessionId.slice(0, 8)}</span>
        {status && (
          <Badge variant="status" color={statusToBadgeColor(status)}>
            {status === 'waiting_for_input' ? 'waiting' : status}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isRunning && (
          <Button
            variant="ghost"
            color="accent"
            size="sm"
            onClick={onInterrupt}
            disabled={isInterrupting}
          >
            interrupt
          </Button>
        )}
        {isActive && (
          <Button
            variant="ghost"
            color="danger"
            size="sm"
            onClick={onStop}
            disabled={isStopping}
          >
            end
          </Button>
        )}
      </div>
    </div>
    {prompt && (
      <p className="mt-1 truncate font-mono text-xs text-text-dim">{prompt}</p>
    )}
  </div>
);

export { SessionHeader };
