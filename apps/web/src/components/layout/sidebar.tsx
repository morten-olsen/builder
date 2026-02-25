import { useState } from 'react';
import { Link, useMatches } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/auth.js';
import { getClient } from '../../client/client.js';
import { useSessionsGrouped } from '../../hooks/use-sessions-grouped.js';

import { SidebarSection } from './sidebar-section.js';
import { SidebarSessionItem } from './sidebar-session-item.js';

type SidebarProps = {
  onNavigate?: () => void;
};

const Sidebar = ({ onNavigate }: SidebarProps): React.ReactNode => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [filterRepoId, setFilterRepoId] = useState<string>('');
  const { groups, isLoading } = useSessionsGrouped({
    filterRepoId: filterRepoId || undefined,
  });
  const matches = useMatches();

  const activeSessionId = matches
    .map((m) => (m.params as Record<string, string>).sessionId)
    .find(Boolean);

  const repos = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/api/repos');
      return data ?? [];
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ sessionId, pinned }: { sessionId: string; pinned: boolean }) => {
      await getClient().api.PUT('/api/sessions/{sessionId}/pin', {
        params: { path: { sessionId } },
        body: { pinned },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const handleTogglePin = (sessionId: string, pinned: boolean): void => {
    pinMutation.mutate({ sessionId, pinned });
  };

  const renderItem = (s: { id: string; status: string; repoUrl: string; branch: string; sessionBranch: string | null; prompt: string; pinnedAt: string | null }): React.ReactNode => (
    <SidebarSessionItem
      key={s.id}
      id={s.id}
      status={s.status}
      repoUrl={s.repoUrl}
      branch={s.branch}
      sessionBranch={s.sessionBranch}
      prompt={s.prompt}
      isActive={s.id === activeSessionId}
      pinnedAt={s.pinnedAt}
      onTogglePin={handleTogglePin}
      onClick={onNavigate}
    />
  );

  const isEmpty =
    groups.pinned.length === 0 &&
    groups.attention.length === 0 &&
    groups.running.length === 0 &&
    groups.pending.length === 0 &&
    groups.recent.length === 0;

  return (
    <div className="flex h-full flex-col bg-surface-1">
      {/* Logo */}
      <div className="flex h-10 items-center gap-2 border-b border-border-base px-4">
        <div className="h-2 w-2 rounded-full bg-accent" />
        <span className="font-mono text-sm font-medium tracking-wide text-text-bright">
          builder
        </span>
      </div>

      {/* New Session */}
      <div className="px-2.5 pt-2.5 pb-0.5">
        <Link
          to="/new"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-accent/30 bg-accent-subtle px-2.5 py-1.5 font-mono text-xs text-accent transition-colors hover:border-accent/50 hover:bg-accent-muted"
        >
          + New Session
        </Link>
      </div>

      {/* Repo filter */}
      {repos.data && repos.data.length > 1 && (
        <div className="px-2.5 pt-1.5">
          <select
            value={filterRepoId}
            onChange={(e) => setFilterRepoId(e.target.value)}
            className="w-full rounded border border-border-base bg-surface-2 px-2 py-1 font-mono text-ui text-text-dim outline-none transition-colors focus:border-accent"
          >
            <option value="">All repos</option>
            {repos.data.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sessions */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto pt-1.5">
        {isLoading ? (
          <div className="px-3 py-4 text-center font-mono text-ui text-text-muted">
            loading...
          </div>
        ) : (
          <>
            {groups.pinned.length > 0 && (
              <SidebarSection title="Pinned" count={groups.pinned.length}>
                {groups.pinned.map(renderItem)}
              </SidebarSection>
            )}

            {groups.attention.length > 0 && (
              <SidebarSection title="Needs Attention" count={groups.attention.length}>
                {groups.attention.map(renderItem)}
              </SidebarSection>
            )}

            {(groups.running.length > 0 || groups.pending.length > 0) && (
              <SidebarSection
                title="Running"
                count={groups.running.length + groups.pending.length}
              >
                {[...groups.running, ...groups.pending].map(renderItem)}
              </SidebarSection>
            )}

            {groups.recent.length > 0 && (
              <SidebarSection title="Recent" count={groups.recent.length} defaultOpen={false}>
                {groups.recent.map(renderItem)}
              </SidebarSection>
            )}

            {isEmpty && (
              <div className="px-3 py-4 text-center font-mono text-ui text-text-muted">
                no sessions yet
              </div>
            )}
          </>
        )}
      </nav>

      {/* Bottom: user + settings */}
      <div className="border-t border-border-base p-2.5">
        <div className="flex items-center gap-2 rounded bg-surface-2 px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-text-dim">{user?.email}</p>
          </div>
          <Link
            to="/settings/repos"
            onClick={onNavigate}
            className="shrink-0 text-text-muted transition-colors hover:text-text-dim"
            title="Settings"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.902 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.422 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.422 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 00-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.693-1.115l-.291.16c-.764.415-1.6-.422-1.184-1.185l.159-.292A1.873 1.873 0 001.66 9.796l-.318-.094c-.835-.246-.835-1.428 0-1.674l.319-.094a1.873 1.873 0 001.115-2.693l-.16-.291c-.415-.764.422-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.116l.094-.318z" />
            </svg>
          </Link>
          <button
            onClick={logout}
            className="shrink-0 font-mono text-ui text-text-muted transition-colors hover:text-danger"
          >
            sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export type { SidebarProps };
export { Sidebar };
