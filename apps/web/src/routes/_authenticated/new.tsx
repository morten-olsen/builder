import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { getClient } from '../../client/client.js';
import { Button } from '../../components/ui/button.js';
import { Input, Textarea } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { Select } from '../../components/ui/select.js';
import { EmptyState } from '../../components/ui/empty-state.js';

const NewSessionPage = (): React.ReactNode => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [repoId, setRepoId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [branch, setBranch] = useState('');

  const repos = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/api/repos');
      return data ?? [];
    },
  });

  const selectedRepo = repos.data?.find((r) => r.id === repoId);

  const createSession = useMutation({
    mutationFn: async () => {
      const { data, error } = await getClient().api.POST('/api/sessions', {
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

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    createSession.mutate();
  };

  if (repos.isLoading) {
    return (
      <div className="p-3 lg:p-5">
        <div className="py-12 text-center font-mono text-xs text-text-muted">loading...</div>
      </div>
    );
  }

  if (repos.data?.length === 0) {
    return (
      <div className="p-3 lg:p-5">
        <EmptyState
          title="No repos configured"
          description={
            <>
              add a repo in{' '}
              <Link to="/settings/repos" className="text-accent hover:text-accent-bright">
                settings
              </Link>{' '}
              to start a session
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-3 lg:p-5">
      <h1 className="mb-4 font-mono text-base font-medium text-text-bright">New Session</h1>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-xl rounded-lg border border-border-base bg-surface-1 p-5"
      >
        <div className="mb-3">
          <Label>Repository</Label>
          <Select
            required
            options={repos.data?.map((r) => ({
              value: r.id,
              label: r.name,
              description: r.repoUrl,
            })) ?? []}
            value={repoId}
            onValueChange={setRepoId}
            placeholder="select a repo..."
          />
        </div>

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
            placeholder={selectedRepo?.defaultBranch ?? 'main'}
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
    </div>
  );
};

const Route = createFileRoute('/_authenticated/new')({
  component: NewSessionPage,
});

export { Route };
