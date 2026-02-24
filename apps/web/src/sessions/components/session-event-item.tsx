import type { SessionEventEntry } from '../use-session-events.js';
import { Alert } from '../../components/ui/alert.js';
import { Button } from '../../components/ui/button.js';
import { AssistantMessage } from './assistant-message.js';
import { ToolCall } from './tool-call.js';
import { ToolResult } from './tool-result.js';

type SessionEventItemProps = {
  event: SessionEventEntry;
  snapshotMessageId?: string;
  onRevert?: (messageId: string) => void;
  isReverting?: boolean;
};

const SessionEventItem = ({ event, snapshotMessageId, onRevert, isReverting }: SessionEventItemProps): React.ReactNode => {
  const data = event.data as Record<string, unknown>;

  switch (event.type) {
    case 'agent:output':
      return <AssistantMessage text={String(data.text ?? '')} />;

    case 'agent:tool_use':
      return <ToolCall tool={String(data.tool ?? '')} input={data.input} />;

    case 'agent:tool_result':
      return <ToolResult toolName={String(data.tool ?? '')} output={data.output} />;

    case 'session:status':
      return (
        <div className="py-1 text-center font-mono text-ui text-text-muted">
          status &rarr; {String(data.status ?? '')}
        </div>
      );

    case 'session:waiting_for_input':
      return (
        <Alert color="info">
          {String(data.prompt ?? 'Waiting for input...')}
        </Alert>
      );

    case 'session:completed':
      return (
        <Alert color="success">
          <p>Session completed.{data.summary ? ` ${String(data.summary)}` : ''}</p>
          {snapshotMessageId && onRevert && (
            <Button
              variant="ghost"
              color="warning"
              size="sm"
              className="mt-2"
              onClick={() => onRevert(snapshotMessageId)}
              disabled={isReverting}
            >
              {isReverting ? 'reverting...' : 'revert to before this run'}
            </Button>
          )}
        </Alert>
      );

    case 'session:error':
      return (
        <Alert color="danger">
          {String(data.error ?? 'Unknown error')}
        </Alert>
      );

    default:
      return null;
  }
};

export { SessionEventItem };
