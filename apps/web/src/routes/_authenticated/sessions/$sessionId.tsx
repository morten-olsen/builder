import { createFileRoute, Link, Outlet, useMatches } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { getClient } from '../../../client/client.js';
import { extractRepoName } from '../../../utils/session.js';
import { StatusDot } from '../../../components/ui/status-dot.js';
import { Badge } from '../../../components/ui/badge.js';

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

const tabs = [
  { to: '/sessions/$sessionId' as const, label: 'build', exact: true },
  { to: '/sessions/$sessionId/review' as const, label: 'review' },
];

const SessionLayout = (): React.ReactNode => {
  const { sessionId } = Route.useParams();
  const matches = useMatches();
  const lastMatchId = matches[matches.length - 1]?.id ?? '';

  const session = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/sessions/{sessionId}', {
        params: { path: { sessionId } },
      });
      if (error || !data) throw new Error(error?.error ?? 'Not found');
      return data;
    },
  });

  const s = session.data;
  const status = s?.status;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border-base bg-surface-1 px-3 py-2 lg:px-5">
        <div className="flex items-center gap-3">
          {s && (
            <>
              <StatusDot status={s.status} size="md" />
              <span className="font-mono text-xs text-text-bright">
                {extractRepoName(s.repoUrl)}
              </span>
              <span className="font-mono text-ui text-text-muted">/</span>
              <span className="font-mono text-xs text-text-dim">{s.branch}</span>
            </>
          )}
          {status && (
            <span className="ml-auto">
              <Badge variant="status" color={statusToBadgeColor(status)}>
                {status === 'waiting_for_input' ? 'waiting' : status}
              </Badge>
            </span>
          )}
        </div>
        {s?.prompt && (
          <p className="mt-1 truncate font-mono text-xs text-text-dim">{s.prompt}</p>
        )}
        <div className="mt-2 flex gap-0">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? !lastMatchId.includes('/review')
              : lastMatchId.includes('/review');

            return (
              <Link
                key={tab.label}
                to={tab.to}
                params={{ sessionId }}
                className={`border-b-2 px-3 py-1.5 font-mono text-ui transition-colors ${
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-dim'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

const Route = createFileRoute('/_authenticated/sessions/$sessionId')({
  component: SessionLayout,
});

export { Route };
