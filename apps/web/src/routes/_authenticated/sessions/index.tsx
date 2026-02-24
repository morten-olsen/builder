import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';

import { useSessionsGrouped } from '../../../hooks/use-sessions-grouped.js';
import { Card } from '../../../components/ui/card.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { StatusDot } from '../../../components/ui/status-dot.js';
import { extractRepoName } from '../../../utils/session.js';

const SessionsPage = (): React.ReactNode => {
  const { groups, isLoading } = useSessionsGrouped();
  const [showCompleted, setShowCompleted] = useState(false);

  const activeList = [...groups.attention, ...groups.running, ...groups.pending];

  return (
    <div className="p-3 lg:p-5">
      <div className="mb-4">
        <h1 className="font-mono text-lg font-medium text-text-bright">Sessions</h1>
        <p className="mt-1 font-mono text-xs text-text-muted">all coding agent sessions</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center font-mono text-xs text-text-muted">loading...</div>
      ) : activeList.length === 0 && groups.recent.length === 0 ? (
        <EmptyState title="no sessions yet" description="start one from a repo page" />
      ) : (
        <>
          {activeList.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {activeList.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          )}

          {groups.recent.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="mb-3 font-mono text-ui text-text-muted transition-colors hover:text-text-dim"
              >
                {showCompleted ? 'hide' : 'show'} completed ({groups.recent.length})
              </button>
              {showCompleted && (
                <div className="space-y-1.5">
                  {groups.recent.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

type SessionRowProps = {
  session: { id: string; status: string; repoUrl: string; branch: string; prompt: string; createdAt: string };
};

const SessionRow = ({ session }: SessionRowProps): React.ReactNode => (
  <Link
    to="/sessions/$sessionId"
    params={{ sessionId: session.id }}
  >
    <Card interactive padding="sm">
      <div className="flex items-center gap-3">
        <StatusDot status={session.status} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm text-text-bright">{session.prompt}</p>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            {extractRepoName(session.repoUrl)} / {session.branch}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-mono text-ui text-text-muted">{session.status}</span>
          <p className="mt-0.5 font-mono text-ui text-text-muted">
            {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Card>
  </Link>
);

const Route = createFileRoute('/_authenticated/sessions/')({
  component: SessionsPage,
});

export { Route };
