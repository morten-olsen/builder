import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getClient } from '../../../client/client.js';
import { Button } from '../../../components/ui/button.js';
import { useSessionEvents } from '../../../sessions/use-session-events.js';
import { SessionEventList } from '../../../sessions/components/session-event-list.js';
import { SessionInput } from '../../../sessions/components/session-input.js';

const SessionDetailPage = (): React.ReactNode => {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const { events, isSynced, reset } = useSessionEvents(sessionId);

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

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await getClient().api.POST('/sessions/{sessionId}/messages', {
        params: { path: { sessionId } },
        body: { message },
      });
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });

  const interrupt = useMutation({
    mutationFn: async () => {
      await getClient().api.POST('/sessions/{sessionId}/interrupt', {
        params: { path: { sessionId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });

  const stopSession = useMutation({
    mutationFn: async () => {
      await getClient().api.POST('/sessions/{sessionId}/stop', {
        params: { path: { sessionId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });

  const revert = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await getClient().api.POST('/sessions/{sessionId}/revert', {
        params: { path: { sessionId } },
        body: { messageId },
      });
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      reset();
    },
  });

  const s = session.data;
  const isRunning = s?.status === 'running';
  const canInput = isRunning || s?.status === 'idle' || s?.status === 'waiting_for_input';

  return (
    <div className="flex h-full flex-col">
      <SessionEventList
        events={events}
        isSynced={isSynced}
        isLoading={session.isLoading}
        status={s?.status}
        onRevert={(messageId) => revert.mutate(messageId)}
        isReverting={revert.isPending}
      />

      {canInput && (
        <SessionInput
          onSend={(message) => sendMessage.mutate(message)}
          isSending={sendMessage.isPending}
          actions={
            <>
              {isRunning && (
                <Button
                  variant="ghost"
                  color="accent"
                  size="sm"
                  onClick={() => interrupt.mutate()}
                  disabled={interrupt.isPending}
                >
                  interrupt
                </Button>
              )}
              <Button
                variant="ghost"
                color="danger"
                size="sm"
                onClick={() => stopSession.mutate()}
                disabled={stopSession.isPending}
              >
                end
              </Button>
            </>
          }
        />
      )}
    </div>
  );
};

const Route = createFileRoute('/_authenticated/sessions/$sessionId/')({
  component: SessionDetailPage,
});

export { Route };
