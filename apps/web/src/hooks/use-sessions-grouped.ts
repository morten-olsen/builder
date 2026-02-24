import { useQuery } from '@tanstack/react-query';

import { getClient } from '../client/client.js';

type Session = {
  id: string;
  repoUrl: string;
  branch: string;
  prompt: string;
  status: string;
  createdAt: string;
};

type GroupedSessions = {
  attention: Session[];
  running: Session[];
  pending: Session[];
  recent: Session[];
};

const attentionStatuses = new Set(['waiting_for_input', 'idle']);
const activeStatuses = new Set(['running']);
const pendingStatuses = new Set(['pending']);

const useSessionsGrouped = (): { groups: GroupedSessions; isLoading: boolean } => {
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/sessions');
      return data ?? [];
    },
  });

  const all = (sessions.data ?? []) as Session[];
  const sorted = [...all].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const attention: Session[] = [];
  const running: Session[] = [];
  const pending: Session[] = [];
  const recent: Session[] = [];

  for (const s of sorted) {
    if (attentionStatuses.has(s.status)) {
      attention.push(s);
    } else if (activeStatuses.has(s.status)) {
      running.push(s);
    } else if (pendingStatuses.has(s.status)) {
      pending.push(s);
    } else {
      recent.push(s);
    }
  }

  return {
    groups: { attention, running, pending, recent: recent.slice(0, 10) },
    isLoading: sessions.isLoading,
  };
};

export type { GroupedSessions, Session };
export { useSessionsGrouped };
