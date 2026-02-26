import { createFileRoute, Link, Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getClient } from '../../../client/client.js';
import { extractRepoName } from '../../../utils/session.js';
import { StatusDot } from '../../../components/ui/status-dot.js';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog.js';

type StatusBadgeColor = 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const statusToBadgeColor = (status: string): StatusBadgeColor => {
  switch (status) {
    case 'running':
    case 'pending':
    case 'idle':
    case 'reverted':
      return 'accent';
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'waiting_for_input':
      return 'warning';
    default:
      return 'neutral';
  }
};

type NotificationState = 'inherit' | 'on' | 'off';

const notificationCycle: Record<NotificationState, NotificationState> = {
  inherit: 'on',
  on: 'off',
  off: 'inherit',
};

const notificationLabel: Record<NotificationState, string> = {
  inherit: 'default',
  on: 'on',
  off: 'off',
};

type NotificationToggleProps = {
  sessionId: string;
};

const NotificationToggle = ({ sessionId }: NotificationToggleProps): React.ReactNode => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<NotificationState>('inherit');

  const mutation = useMutation({
    mutationFn: async (next: NotificationState) => {
      const enabled = next === 'inherit' ? null : next === 'on';
      await getClient().api.PUT('/api/sessions/{sessionId}/notifications', {
        params: { path: { sessionId } },
        body: { enabled },
      });
      return next;
    },
    onSuccess: (next) => {
      setState(next);
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });

  const handleClick = (): void => {
    const next = notificationCycle[state];
    mutation.mutate(next);
  };

  const isActive = state !== 'off';

  return (
    <button
      onClick={handleClick}
      title={`Notifications: ${notificationLabel[state]}`}
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-ui transition-colors ${
        isActive
          ? 'text-text-dim hover:text-text-bright'
          : 'text-text-muted/40 hover:text-text-muted'
      }`}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5A3.5 3.5 0 0 0 4.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556-.003.004A1 1 0 0 0 3.33 13h9.34a1 1 0 0 0 .83-1.523l-.003-.004-1.703-2.556a1.75 1.75 0 0 1-.294-.97V5A3.5 3.5 0 0 0 8 1.5ZM6 14.5a2 2 0 0 0 4 0H6Z" />
      </svg>
      <span className="text-ui">{notificationLabel[state]}</span>
    </button>
  );
};

type PinToggleProps = {
  sessionId: string;
  pinnedAt: string | null;
};

const PinToggle = ({ sessionId, pinnedAt }: PinToggleProps): React.ReactNode => {
  const queryClient = useQueryClient();
  const isPinned = !!pinnedAt;

  const mutation = useMutation({
    mutationFn: async (pinned: boolean) => {
      await getClient().api.PUT('/api/sessions/{sessionId}/pin', {
        params: { path: { sessionId } },
        body: { pinned },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return (
    <button
      onClick={() => mutation.mutate(!isPinned)}
      title={isPinned ? 'Unpin session' : 'Pin session'}
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-ui transition-colors ${
        isPinned
          ? 'text-accent hover:text-accent-bright'
          : 'text-text-muted/40 hover:text-text-muted'
      }`}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.456.734a1.75 1.75 0 0 1 2.826.504l.613 1.327a3.08 3.08 0 0 0 2.084 1.707l2.454.584c1.332.317 1.8 1.972.832 2.94L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-2.204 2.205c-.968.968-2.623.5-2.94-.832l-.584-2.454a3.08 3.08 0 0 0-1.707-2.084l-1.327-.613a1.75 1.75 0 0 1-.504-2.826L4.456.734Z" />
      </svg>
      <span className="text-ui">{isPinned ? 'pinned' : 'pin'}</span>
    </button>
  );
};

const tabs = [
  { to: '/sessions/$sessionId' as const, label: 'build', exact: true },
  { to: '/sessions/$sessionId/review' as const, label: 'review' },
];

const SessionLayout = (): React.ReactNode => {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const matches = useMatches();
  const lastMatchId = matches[matches.length - 1]?.id ?? '';

  const deleteSession = useMutation({
    mutationFn: async () => {
      await getClient().api.DELETE('/api/sessions/{sessionId}', {
        params: { path: { sessionId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      void navigate({ to: '/' });
    },
  });

  const session = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/api/sessions/{sessionId}', {
        params: { path: { sessionId } },
      });
      if (error || !data) throw new Error(error?.error ?? 'Not found');
      return data;
    },
  });

  const s = session.data;
  const status = s?.status;
  const isRunning = status === 'running' || status === 'pending';

  return (
    <div className="relative flex h-full flex-col">
      {/* ECG heartbeat indicator */}
      {isRunning && (
        <div className="absolute inset-x-0 top-0 z-10 h-1.5 overflow-hidden">
          <svg className="h-full w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
            <path
              d="M0,4 L40,4 L45,1 L50,7 L55,2 L60,5 L65,4 L200,4"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeDasharray="200"
              style={{ animation: 'ecg-trace 2s linear infinite' }}
            />
          </svg>
        </div>
      )}
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
          <span className="ml-auto flex items-center gap-2">
            {s && <PinToggle sessionId={sessionId} pinnedAt={s.pinnedAt} />}
            {status && (
              <>
                <NotificationToggle sessionId={sessionId} />
                <Badge variant="status" color={statusToBadgeColor(status)}>
                  {status === 'waiting_for_input' ? 'waiting' : status}
                </Badge>
              </>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="ghost" color="danger" size="sm">
                  delete
                </Button>
              }
              title="Delete this session?"
              description="This will permanently remove the session and all its data."
              confirmLabel="delete"
              confirmColor="danger"
              onConfirm={() => deleteSession.mutate()}
            />
          </span>
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
                    : 'border-transparent text-text-muted hover:text-accent/60'
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
