import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { getClient } from '../../../client/client.js';
import { useAuth } from '../../../auth/auth.js';
import { Button } from '../../../components/ui/button.js';
import { Card } from '../../../components/ui/card.js';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog.js';
import { Input, Textarea } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';
import { SectionHeader } from '../../../components/ui/section-header.js';
import { StatusDot } from '../../../components/ui/status-dot.js';

const RepoDetailPage = (): React.ReactNode => {
  const { repoId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewSession, setShowNewSession] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [branch, setBranch] = useState('');

  const repo = useQuery({
    queryKey: ['repos', repoId],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/repos/{repoId}', {
        params: { path: { repoId } },
      });
      if (error || !data) throw new Error(error?.error ?? 'Not found');
      return data;
    },
  });

  const sessions = useQuery({
    queryKey: ['repos', repoId, 'sessions'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/repos/{repoId}/sessions', {
        params: { path: { repoId } },
      });
      return data ?? [];
    },
  });

  const identities = useQuery({
    queryKey: ['identities'],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await getClient().api.GET('/users/{userId}/identities', {
        params: { path: { userId: user.id } },
      });
      return data ?? [];
    },
    enabled: !!user,
  });

  const updateRepo = useMutation({
    mutationFn: async (body: { defaultIdentityId?: string | null; defaultBranch?: string | null }) => {
      const { data, error } = await getClient().api.PUT('/repos/{repoId}', {
        params: { path: { repoId } },
        body,
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to update repo');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['repos', repoId] });
    },
  });

  const deleteRepo = useMutation({
    mutationFn: async () => {
      await getClient().api.DELETE('/repos/{repoId}', {
        params: { path: { repoId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['repos'] });
      void navigate({ to: '/settings/repos' });
    },
  });

  const createSession = useMutation({
    mutationFn: async () => {
      const { data, error } = await getClient().api.POST('/sessions', {
        body: {
          repoId,
          prompt,
          ...(branch ? { branch } : {}),
        },
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to create session');
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      void navigate({ to: '/sessions/$sessionId', params: { sessionId: data.id } });
    },
  });

  const handleCreateSession = (e: FormEvent): void => {
    e.preventDefault();
    createSession.mutate();
  };

  if (repo.isLoading) {
    return <p className="font-mono text-xs text-text-muted">loading...</p>;
  }

  if (repo.error || !repo.data) {
    return (
      <div>
        <p className="font-mono text-xs text-danger">Failed to load repo</p>
        <Link
          to="/settings/repos"
          className="mt-2 inline-block font-mono text-xs text-accent hover:text-accent-bright"
        >
          back to repos
        </Link>
      </div>
    );
  }

  const r = repo.data;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/settings/repos" className="font-mono text-xs text-text-muted hover:text-text-dim">
          repos
        </Link>
        <span className="mx-2 font-mono text-xs text-text-muted">/</span>
        <span className="font-mono text-xs text-text-base">{r.name}</span>
      </div>

      {/* Repo info */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-mono text-base font-medium text-text-bright">{r.name}</h2>
          <p className="mt-1 font-mono text-xs text-text-muted">{r.repoUrl}</p>
        </div>
        <ConfirmDialog
          trigger={
            <Button variant="ghost" color="danger" size="sm">
              delete
            </Button>
          }
          title="Delete this repo?"
          description="All sessions for this repo will also be removed."
          confirmLabel="delete"
          confirmColor="danger"
          onConfirm={() => deleteRepo.mutate()}
        />
      </div>

      {/* Repo details */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card padding="sm">
          <SectionHeader size="sm">Branch</SectionHeader>
          <p className="mt-1 font-mono text-sm text-text-base">{r.defaultBranch ?? '\u2014'}</p>
        </Card>
        <Card padding="sm">
          <SectionHeader size="sm">Identity</SectionHeader>
          <div className="mt-1">
            <Select
              selectSize="sm"
              options={[
                { value: '', label: 'none' },
                ...(identities.data?.map((id) => ({
                  value: id.id,
                  label: `${id.name} (${id.gitAuthorEmail})`,
                })) ?? []),
              ]}
              value={r.defaultIdentityId ?? ''}
              onValueChange={(value) => {
                updateRepo.mutate({ defaultIdentityId: value || null });
              }}
            />
          </div>
        </Card>
        <Card padding="sm">
          <SectionHeader size="sm">Sessions</SectionHeader>
          <p className="mt-1 font-mono text-sm text-text-base">
            {sessions.isLoading ? '\u2014' : (sessions.data?.length ?? 0)}
          </p>
        </Card>
      </div>

      {/* Sessions section */}
      <div className="rounded-lg border border-border-base bg-surface-1">
        <div className="flex items-center justify-between border-b border-border-base px-4 py-2.5">
          <SectionHeader>Sessions</SectionHeader>
          <button
            onClick={() => setShowNewSession(!showNewSession)}
            className="font-mono text-ui text-accent-dim transition-colors hover:text-accent"
          >
            {showNewSession ? 'cancel' : '+ new session'}
          </button>
        </div>

        {showNewSession && (
          <form onSubmit={handleCreateSession} className="border-b border-border-base bg-surface-0/50 p-4">
            <div className="mb-3">
              <Label>Prompt</Label>
              <Textarea
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="describe what the agent should do..."
              />
            </div>
            <div className="mb-3">
              <Label>Branch (optional)</Label>
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder={r.defaultBranch ?? 'main'}
              />
            </div>
            {createSession.error && (
              <p className="mb-3 font-mono text-xs text-danger">
                {createSession.error instanceof Error ? createSession.error.message : 'Failed'}
              </p>
            )}
            <Button type="submit" disabled={createSession.isPending}>
              {createSession.isPending ? 'starting...' : 'start session'}
            </Button>
          </form>
        )}

        {sessions.isLoading ? (
          <div className="px-4 py-6 text-center font-mono text-xs text-text-muted">loading...</div>
        ) : (sessions.data?.length ?? 0) === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-xs text-text-muted">
            no sessions for this repo
          </div>
        ) : (
          <div>
            {sessions.data
              ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((session) => (
                <Link
                  key={session.id}
                  to="/sessions/$sessionId"
                  params={{ sessionId: session.id }}
                  className="flex items-center gap-3 border-b border-border-dim px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface-2"
                >
                  <StatusDot status={session.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-text-base">{session.prompt}</p>
                    <p className="mt-0.5 font-mono text-ui text-text-muted">
                      {session.branch} · {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-ui text-text-muted">
                    {session.status}
                  </span>
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Route = createFileRoute('/_authenticated/settings/repos/$repoId')({
  component: RepoDetailPage,
});

export { Route };
