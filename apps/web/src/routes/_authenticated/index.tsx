import { createFileRoute, Link } from '@tanstack/react-router';

import { useSessionsGrouped } from '../../hooks/use-sessions-grouped.js';
import { Badge } from '../../components/ui/badge.js';
import { Card } from '../../components/ui/card.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { SectionHeader } from '../../components/ui/section-header.js';
import { StatusDot } from '../../components/ui/status-dot.js';
import { extractRepoName } from '../../utils/session.js';

const HomePage = (): React.ReactNode => {
  const { groups, isLoading } = useSessionsGrouped();

  const hasActive = groups.attention.length > 0 || groups.running.length > 0 || groups.pending.length > 0;

  return (
    <div className="p-3 lg:p-5">
      {isLoading ? (
        <div className="py-12 text-center font-mono text-xs text-text-muted">loading...</div>
      ) : !hasActive && groups.recent.length === 0 ? (
        <EmptyState
          title="No active sessions"
          description={
            <>
              start a{' '}
              <Link to="/new" className="text-accent hover:text-accent-bright">
                new session
              </Link>
            </>
          }
        />
      ) : (
        <>
          {groups.attention.length > 0 && (
            <section className="mb-4">
              <SectionHeader className="mb-2">Needs Attention</SectionHeader>
              <div className="space-y-1.5">
                {groups.attention.map((s, i) => (
                  <div key={s.id} style={{ animation: `stagger-in 0.3s ease-out ${i * 0.06}s both` }}>
                    <SessionCard session={s} action="Respond" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {(groups.running.length > 0 || groups.pending.length > 0) && (
            <section className="mb-4">
              <SectionHeader className="mb-2">Running</SectionHeader>
              <div className="space-y-1.5">
                {[...groups.running, ...groups.pending].map((s, i) => (
                  <div key={s.id} style={{ animation: `stagger-in 0.3s ease-out ${i * 0.06}s both` }}>
                    <SessionCard session={s} action="View" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {groups.recent.length > 0 && (
            <section>
              <SectionHeader className="mb-2">Recent</SectionHeader>
              <div className="space-y-1.5">
                {groups.recent.map((s, i) => (
                  <div key={s.id} style={{ animation: `stagger-in 0.3s ease-out ${i * 0.06}s both` }}>
                    <SessionCard session={s} action="View" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

type SessionCardProps = {
  session: { id: string; status: string; repoUrl: string; branch: string; prompt: string; createdAt: string };
  action: string;
};

const SessionCard = ({ session, action }: SessionCardProps): React.ReactNode => (
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
        <Badge variant="status" color="accent">{action}</Badge>
      </div>
    </Card>
  </Link>
);

const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
});

export { Route };
