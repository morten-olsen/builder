import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getClient } from '../client/client.js';

const useUserEvents = (): void => {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const connect = (): void => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      getClient()
        .streamUserEvents(
          (event) => {
            if (controller.signal.aborted) return;

            if (event.type === 'session:updated') {
              void queryClient.invalidateQueries({ queryKey: ['sessions'] });
              void queryClient.invalidateQueries({
                queryKey: ['sessions', event.data.sessionId],
              });
            }
          },
          { signal: controller.signal },
        )
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) {
            // Reconnect after 2s on disconnect
            setTimeout(connect, 2000);
          }
        });
    };

    connect();

    return () => {
      abortRef.current?.abort();
    };
  }, [queryClient]);
};

export { useUserEvents };
