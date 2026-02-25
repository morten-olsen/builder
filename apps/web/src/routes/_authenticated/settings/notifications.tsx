import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { getClient } from '../../../client/client.js';
import { useAuth } from '../../../auth/auth.js';
import { Button } from '../../../components/ui/button.js';
import { Card } from '../../../components/ui/card.js';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';

const eventLabels: Record<string, string> = {
  'session:completed': 'Session completed',
  'session:error': 'Session failed',
  'session:waiting_for_input': 'Input needed',
};

const allEvents = Object.keys(eventLabels);

type NtfyAuthMode = 'token' | 'password';

type NtfyConfigFormProps = {
  server: string;
  topic: string;
  token: string;
  username: string;
  password: string;
  authMode: NtfyAuthMode;
  onServerChange: (v: string) => void;
  onTopicChange: (v: string) => void;
  onTokenChange: (v: string) => void;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onAuthModeChange: (v: NtfyAuthMode) => void;
};

const NtfyConfigForm = ({ server, topic, token, username, password, authMode, onServerChange, onTopicChange, onTokenChange, onUsernameChange, onPasswordChange, onAuthModeChange }: NtfyConfigFormProps): React.ReactNode => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <Label>Server URL</Label>
        <Input
          value={server}
          onChange={(e) => onServerChange(e.target.value)}
          placeholder="https://ntfy.sh"
        />
      </div>
      <div>
        <Label>Topic</Label>
        <Input
          required
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="my-builder-notifications"
        />
      </div>
    </div>
    <div>
      <Label>Authentication</Label>
      <div className="mt-1 flex gap-3">
        <label className="flex items-center gap-1.5 font-mono text-xs text-text-dim">
          <input
            type="radio"
            name="ntfy-auth"
            checked={authMode === 'token'}
            onChange={() => onAuthModeChange('token')}
            className="accent-accent"
          />
          access token
        </label>
        <label className="flex items-center gap-1.5 font-mono text-xs text-text-dim">
          <input
            type="radio"
            name="ntfy-auth"
            checked={authMode === 'password'}
            onChange={() => onAuthModeChange('password')}
            className="accent-accent"
          />
          username / password
        </label>
      </div>
    </div>
    {authMode === 'token' ? (
      <div>
        <Label>Access token</Label>
        <Input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="optional"
        />
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Username</Label>
          <Input
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="username"
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="password"
          />
        </div>
      </div>
    )}
  </div>
);

const providerConfigForms: Record<string, typeof NtfyConfigForm> = {
  ntfy: NtfyConfigForm,
};

const buildConfig = (provider: string, state: { server: string; topic: string; token: string; username: string; password: string; authMode: NtfyAuthMode }): Record<string, unknown> => {
  if (provider === 'ntfy') {
    const config: Record<string, unknown> = {
      server: state.server || 'https://ntfy.sh',
      topic: state.topic,
    };
    if (state.authMode === 'token' && state.token) {
      config.token = state.token;
    } else if (state.authMode === 'password' && state.username && state.password) {
      config.username = state.username;
      config.password = state.password;
    }
    return config;
  }
  return {};
};

const NotificationsPage = (): React.ReactNode => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Preferences
  const preferences = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/api/notification-preferences');
      return data ?? { notificationsEnabled: true, notificationEvents: allEvents };
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (body: { notificationsEnabled?: boolean; notificationEvents?: string[] }) => {
      const { data, error } = await getClient().api.PUT('/api/notification-preferences', { body });
      if (error || !data) throw new Error('Failed to update preferences');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  // Providers
  const providers = useQuery({
    queryKey: ['notification-providers'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/api/notification-channels/providers');
      return data ?? [];
    },
    enabled: !!user,
  });

  // Channels
  const channels = useQuery({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/api/notification-channels');
      return data ?? [];
    },
    enabled: !!user,
  });

  // Create channel state
  const [showCreate, setShowCreate] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [configServer, setConfigServer] = useState('https://ntfy.sh');
  const [configTopic, setConfigTopic] = useState('');
  const [configToken, setConfigToken] = useState('');
  const [configUsername, setConfigUsername] = useState('');
  const [configPassword, setConfigPassword] = useState('');
  const [configAuthMode, setConfigAuthMode] = useState<NtfyAuthMode>('token');

  const createChannel = useMutation({
    mutationFn: async () => {
      const provider = selectedProvider;
      const config = buildConfig(provider, { server: configServer, topic: configTopic, token: configToken, username: configUsername, password: configPassword, authMode: configAuthMode });
      const { data, error } = await getClient().api.POST('/api/notification-channels', {
        body: { name: channelName, provider, config },
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to create channel');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setShowCreate(false);
      setChannelName('');
      setSelectedProvider('');
      setConfigServer('https://ntfy.sh');
      setConfigTopic('');
      setConfigToken('');
      setConfigUsername('');
      setConfigPassword('');
      setConfigAuthMode('token');
    },
  });

  const deleteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      await getClient().api.DELETE('/api/notification-channels/{channelId}', {
        params: { path: { channelId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });

  const toggleChannel = useMutation({
    mutationFn: async (input: { channelId: string; enabled: boolean }) => {
      const { data, error } = await getClient().api.PUT('/api/notification-channels/{channelId}', {
        params: { path: { channelId: input.channelId } },
        body: { enabled: input.enabled },
      });
      if (error || !data) throw new Error('Failed to update channel');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ channelId: string; success: boolean; message: string } | null>(null);

  const testChannel = useMutation({
    mutationFn: async (channelId: string) => {
      setTestingId(channelId);
      const { data, error } = await getClient().api.POST('/api/notification-channels/{channelId}/test', {
        params: { path: { channelId } },
      });
      if (error) throw new Error(error?.error ?? 'Test failed');
      return data;
    },
    onSuccess: (_data, channelId) => {
      setTestResult({ channelId, success: true, message: 'sent!' });
      setTestingId(null);
      setTimeout(() => setTestResult(null), 3000);
    },
    onError: (err, channelId) => {
      setTestResult({ channelId, success: false, message: err instanceof Error ? err.message : 'failed' });
      setTestingId(null);
      setTimeout(() => setTestResult(null), 3000);
    },
  });

  const handleCreate = (e: FormEvent): void => {
    e.preventDefault();
    createChannel.mutate();
  };

  const prefs = preferences.data;
  const currentEvents = prefs?.notificationEvents ?? allEvents;

  const toggleEvent = (eventType: string): void => {
    const next = currentEvents.includes(eventType)
      ? currentEvents.filter((e) => e !== eventType)
      : [...currentEvents, eventType];
    updatePreferences.mutate({ notificationEvents: next });
  };

  const toggleGlobal = (): void => {
    updatePreferences.mutate({ notificationsEnabled: !prefs?.notificationsEnabled });
  };

  const providerOptions = (providers.data ?? []).map((p) => ({
    value: typeof p === 'string' ? p : String(p),
    label: typeof p === 'string' ? p : String(p),
  }));

  const ConfigForm = selectedProvider ? providerConfigForms[selectedProvider] : undefined;

  return (
    <div>
      {/* Preferences section */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-xs text-text-muted">global notification settings</p>
          <button
            onClick={toggleGlobal}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              prefs?.notificationsEnabled ? 'bg-accent' : 'bg-surface-3'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                prefs?.notificationsEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          {allEvents.map((eventType) => (
            <label
              key={eventType}
              className="flex items-center gap-2 rounded border border-border-base bg-surface-1 px-3 py-2 font-mono text-xs text-text-dim"
            >
              <input
                type="checkbox"
                checked={currentEvents.includes(eventType)}
                onChange={() => toggleEvent(eventType)}
                className="accent-accent"
              />
              {eventLabels[eventType]}
            </label>
          ))}
        </div>
      </div>

      {/* Channels section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-xs text-text-muted">notification channels</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? 'cancel' : '+ new channel'}
          </Button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-4 rounded-lg border border-border-base bg-surface-1 p-4"
          >
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="My Phone"
                />
              </div>
              <div>
                <Label>Provider</Label>
                <Select
                  options={providerOptions}
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                  placeholder="select provider..."
                  selectSize="sm"
                />
              </div>
            </div>

            {ConfigForm && (
              <div className="mb-3">
                <ConfigForm
                  server={configServer}
                  topic={configTopic}
                  token={configToken}
                  username={configUsername}
                  password={configPassword}
                  authMode={configAuthMode}
                  onServerChange={setConfigServer}
                  onTopicChange={setConfigTopic}
                  onTokenChange={setConfigToken}
                  onUsernameChange={setConfigUsername}
                  onPasswordChange={setConfigPassword}
                  onAuthModeChange={setConfigAuthMode}
                />
              </div>
            )}

            {createChannel.error && (
              <p className="mt-3 font-mono text-xs text-danger">
                {createChannel.error instanceof Error ? createChannel.error.message : 'Failed'}
              </p>
            )}

            <Button type="submit" disabled={createChannel.isPending || !selectedProvider}>
              {createChannel.isPending ? 'creating...' : 'create channel'}
            </Button>
          </form>
        )}

        {channels.isLoading ? (
          <div className="py-12 text-center font-mono text-xs text-text-muted">loading...</div>
        ) : (channels.data?.length ?? 0) === 0 ? (
          <EmptyState title="no channels yet" description="add a notification channel to get alerts" />
        ) : (
          <div className="space-y-1.5">
            {channels.data?.map((channel) => (
              <Card key={channel.id} padding="sm" className="!p-0">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="font-mono text-sm font-medium text-text-bright">{channel.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-text-muted">{channel.provider}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleChannel.mutate({ channelId: channel.id, enabled: !channel.enabled })}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        channel.enabled ? 'bg-accent' : 'bg-surface-3'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          channel.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => testChannel.mutate(channel.id)}
                      disabled={testingId === channel.id}
                      className="font-mono text-ui text-accent-dim transition-colors hover:text-accent disabled:opacity-40"
                    >
                      {testingId === channel.id
                        ? 'testing...'
                        : testResult?.channelId === channel.id
                          ? testResult.success
                            ? 'sent!'
                            : 'failed'
                          : 'test'}
                    </button>
                    <ConfirmDialog
                      trigger={
                        <button className="font-mono text-ui text-text-muted transition-colors hover:text-danger">
                          delete
                        </button>
                      }
                      title="Delete this channel?"
                      confirmLabel="delete"
                      confirmColor="danger"
                      onConfirm={() => deleteChannel.mutate(channel.id)}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Route = createFileRoute('/_authenticated/settings/notifications')({
  component: NotificationsPage,
});

export { Route };
