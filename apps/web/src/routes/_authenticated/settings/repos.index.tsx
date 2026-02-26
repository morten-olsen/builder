import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { getClient } from '../../../client/client.js';
import { useAuth } from '../../../auth/auth.js';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Card } from '../../../components/ui/card.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';

const ReposPage = (): React.ReactNode => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('');
  const [defaultIdentityId, setDefaultIdentityId] = useState('');

  const repos = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/api/repos');
      return data ?? [];
    },
  });

  const identities = useQuery({
    queryKey: ['identities'],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await getClient().api.GET('/api/users/{userId}/identities', {
        params: { path: { userId: user.id } },
      });
      return data ?? [];
    },
    enabled: !!user,
  });

  const createRepo = useMutation({
    mutationFn: async () => {
      const { data, error } = await getClient().api.POST('/api/repos', {
        body: {
          id,
          name,
          repoUrl,
          ...(defaultBranch ? { defaultBranch } : {}),
          ...(defaultIdentityId ? { defaultIdentityId } : {}),
        },
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to create repo');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['repos'] });
      setShowCreate(false);
      setId('');
      setName('');
      setRepoUrl('');
      setDefaultBranch('');
      setDefaultIdentityId('');
    },
  });

  const handleCreate = (e: FormEvent): void => {
    e.preventDefault();
    createRepo.mutate();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs text-text-muted">manage git repositories</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? 'cancel' : '+ new repo'}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-lg border border-border-base bg-surface-1 p-4"
        >
          <div className="mb-3">
            <Label>ID</Label>
            <Input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="my-project"
              pattern="^[a-z0-9][a-z0-9._-]*$"
              title="Lowercase slug"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Display name</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
              />
            </div>
            <div>
              <Label>Repository URL</Label>
              <Input
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="git@github.com:org/repo.git"
              />
            </div>
            <div>
              <Label>Default branch</Label>
              <Input
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main (optional)"
              />
            </div>
            <div>
              <Label>Identity</Label>
              <Select
                options={[
                  { value: '', label: 'none (optional)' },
                  ...(identities.data?.map((id) => ({
                    value: id.id,
                    label: `${id.name} (${id.gitAuthorEmail})`,
                  })) ?? []),
                ]}
                value={defaultIdentityId}
                onValueChange={setDefaultIdentityId}
              />
            </div>
          </div>

          {createRepo.error && (
            <p className="mt-3 font-mono text-xs text-danger">
              {createRepo.error instanceof Error ? createRepo.error.message : 'Failed to create'}
            </p>
          )}

          <Button type="submit" disabled={createRepo.isPending} className="mt-3">
            {createRepo.isPending ? 'creating...' : 'create repo'}
          </Button>
        </form>
      )}

      {/* List */}
      {repos.isLoading ? (
        <div className="py-12 text-center font-mono text-xs text-text-muted">loading...</div>
      ) : (repos.data?.length ?? 0) === 0 ? (
        <EmptyState title="no repos yet" description="create one to start coding sessions" />
      ) : (
        <div className="space-y-1.5">
          {repos.data?.map((repo) => (
            <Link
              key={repo.id}
              to="/settings/repos/$repoId"
              params={{ repoId: repo.id }}
            >
              <Card interactive padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium text-text-bright">{repo.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-text-muted">{repo.repoUrl}</p>
                  </div>
                  <div className="text-right">
                    {repo.defaultBranch && (
                      <Badge variant="tag">{repo.defaultBranch}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Route = createFileRoute('/_authenticated/settings/repos/')({
  component: ReposPage,
});

export { Route };
