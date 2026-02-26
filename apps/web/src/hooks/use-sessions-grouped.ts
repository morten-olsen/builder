import { useQuery } from '@tanstack/react-query';

import { getClient } from '../client/client.js';

type Session = {
  id: string;
  repoUrl: string;
  branch: string;
  prompt: string;
  status: string;
  repoId: string;
  pinnedAt: string | null;
  createdAt: string;
};

type GroupedSessions = {
  pinned: Session[];
  attention: Session[];
  running: Session[];
  pending: Session[];
  recent: Session[];
};

const attentionStatuses = new Set(['waiting_for_input', 'idle', 'reverted']);
const activeStatuses = new Set(['running']);
const pendingStatuses = new Set(['pending']);

type UseSessionsGroupedOptions = {
  filterRepoId?: string;
};

const useSessionsGrouped = (options?: UseSessionsGroupedOptions): { groups: GroupedSessions; isLoading: boolean } => {
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await getClient().api.GET('/api/sessions');
      return data ?? [];
    },
  });

  const all = (sessions.data ?? []) as Session[];
  const sorted = [...all].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const pinned: Session[] = [];
  const attention: Session[] = [];
  const running: Session[] = [];
  const pending: Session[] = [];
  const recent: Session[] = [];

  const filterRepoId = options?.filterRepoId;

  for (const s of sorted) {
    if (s.pinnedAt) {
      pinned.push(s);
      continue;
    }

    // Non-pinned sessions respect repo filter
    if (filterRepoId && s.repoId !== filterRepoId) {
      continue;
    }

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

  // Sort pinned by pinnedAt desc
  pinned.sort((a, b) => new Date(b.pinnedAt as string).getTime() - new Date(a.pinnedAt as string).getTime());

  return {
    groups: { pinned, attention, running, pending, recent: recent.slice(0, 10) },
    isLoading: sessions.isLoading,
  };
};

export type { GroupedSessions, Session };
export { useSessionsGrouped };
