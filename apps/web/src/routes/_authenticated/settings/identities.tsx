import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type FormEvent } from 'react';

import { getClient } from '../../../client/client.js';
import { useAuth } from '../../../auth/auth.js';
import { Button } from '../../../components/ui/button.js';
import { Card } from '../../../components/ui/card.js';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { Input, Textarea } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { SectionHeader } from '../../../components/ui/section-header.js';

const IdentitiesPage = (): React.ReactNode => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<'generate' | 'import'>('generate');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [gitName, setGitName] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');

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

  const createIdentity = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await getClient().api.POST('/api/users/{userId}/identities', {
        params: { path: { userId: user.id } },
        body: {
          id,
          name,
          gitAuthorName: gitName,
          gitAuthorEmail: gitEmail,
          ...(mode === 'import' ? { privateKey } : {}),
        },
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to create identity');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['identities'] });
      setShowCreate(false);
      setMode('generate');
      setId('');
      setName('');
      setGitName('');
      setGitEmail('');
      setPrivateKey('');
    },
  });

  const deleteIdentity = useMutation({
    mutationFn: async (identityId: string) => {
      if (!user) throw new Error('Not authenticated');
      await getClient().api.DELETE('/api/users/{userId}/identities/{identityId}', {
        params: { path: { userId: user.id, identityId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['identities'] });
    },
  });

  const handleCreate = (e: FormEvent): void => {
    e.preventDefault();
    createIdentity.mutate();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs text-text-muted">git author identities for coding sessions</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? 'cancel' : '+ new identity'}
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-lg border border-border-base bg-surface-1 p-4"
        >
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('generate')}
              className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
                mode === 'generate'
                  ? 'bg-accent-dim text-text-bright'
                  : 'bg-surface-2 text-text-muted hover:text-text-dim'
              }`}
            >
              generate new key
            </button>
            <button
              type="button"
              onClick={() => setMode('import')}
              className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
                mode === 'import'
                  ? 'bg-accent-dim text-text-bright'
                  : 'bg-surface-2 text-text-muted hover:text-text-dim'
              }`}
            >
              import existing key
            </button>
          </div>

          <div className="mb-3">
            <Label>ID</Label>
            <Input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="work"
              pattern="^[a-z0-9][a-z0-9._-]*$"
              title="Lowercase slug"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Display name</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Work"
              />
            </div>
            <div>
              <Label>Git author name</Label>
              <Input
                required
                value={gitName}
                onChange={(e) => setGitName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <Label>Git author email</Label>
              <Input
                required
                type="email"
                value={gitEmail}
                onChange={(e) => setGitEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
          </div>

          {mode === 'import' && (
            <div className="mt-3">
              <Label>Private key</Label>
              <Textarea
                required
                rows={6}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                className="!text-xs !leading-snug"
              />
              <p className="mt-1 font-mono text-ui text-text-muted">
                the public key will be derived automatically
              </p>
            </div>
          )}

          {createIdentity.error && (
            <p className="mt-3 font-mono text-xs text-danger">
              {createIdentity.error instanceof Error ? createIdentity.error.message : 'Failed'}
            </p>
          )}

          <Button type="submit" disabled={createIdentity.isPending} className="mt-3">
            {createIdentity.isPending ? 'creating...' : mode === 'import' ? 'import identity' : 'create identity'}
          </Button>
        </form>
      )}

      {identities.isLoading ? (
        <div className="py-12 text-center font-mono text-xs text-text-muted">loading...</div>
      ) : (identities.data?.length ?? 0) === 0 ? (
        <EmptyState title="no identities yet" description="create one to use with coding sessions" />
      ) : (
        <div className="space-y-1.5">
          {identities.data?.map((identity) => (
            <IdentityCard
              key={identity.id}
              identity={identity}
              onDelete={() => deleteIdentity.mutate(identity.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

type IdentityData = {
  id: string;
  name: string;
  gitAuthorName: string;
  gitAuthorEmail: string;
  publicKey: string;
};

type IdentityCardProps = {
  identity: IdentityData;
  onDelete: () => void;
};

const IdentityCard = ({ identity, onDelete }: IdentityCardProps): React.ReactNode => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKey = useCallback(async (): Promise<void> => {
    await navigator.clipboard.writeText(identity.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [identity.publicKey]);

  return (
    <Card padding="sm" className="!p-0">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div>
          <p className="font-mono text-sm font-medium text-text-bright">{identity.name}</p>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            {identity.gitAuthorName} &lt;{identity.gitAuthorEmail}&gt;
          </p>
        </div>
        <div className="flex items-center gap-3">
          {identity.publicKey ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-ui text-accent-dim transition-colors hover:text-accent"
            >
              {expanded ? 'hide key' : 'show key'}
            </button>
          ) : (
            <span className="font-mono text-ui text-text-muted">no key</span>
          )}
          <ConfirmDialog
            trigger={
              <button className="font-mono text-ui text-text-muted transition-colors hover:text-danger">
                delete
              </button>
            }
            title="Delete this identity?"
            confirmLabel="delete"
            confirmColor="danger"
            onConfirm={onDelete}
          />
        </div>
      </div>
      {expanded && identity.publicKey && (
        <div className="border-t border-border-dim px-4 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <SectionHeader size="sm">Public key</SectionHeader>
            <button
              onClick={() => void copyKey()}
              className="font-mono text-ui text-accent-dim transition-colors hover:text-accent"
            >
              {copied ? 'copied!' : 'copy'}
            </button>
          </div>
          <pre className="overflow-x-auto rounded bg-surface-0 p-2.5 font-mono text-ui leading-relaxed text-text-dim">
            {identity.publicKey}
          </pre>
        </div>
      )}
    </Card>
  );
};

const Route = createFileRoute('/_authenticated/settings/identities')({
  component: IdentitiesPage,
});

export { Route };
