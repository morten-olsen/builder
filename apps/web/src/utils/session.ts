const extractRepoName = (repoUrl: string): string => {
  return repoUrl.split('/').pop()?.replace('.git', '') ?? repoUrl;
};

type StatusColor = {
  dot: string;
  badge: string;
};

const statusColors: Record<string, StatusColor> = {
  running: {
    dot: 'bg-accent animate-pulse',
    badge: 'border-accent/30 bg-accent-subtle text-accent',
  },
  pending: {
    dot: 'bg-accent animate-pulse',
    badge: 'border-accent/20 bg-accent-subtle text-accent-dim',
  },
  waiting_for_input: {
    dot: 'bg-info animate-pulse',
    badge: 'border-info/30 bg-info/5 text-info',
  },
  idle: {
    dot: 'bg-info',
    badge: 'border-accent/20 bg-accent-subtle text-accent-dim',
  },
  completed: {
    dot: 'bg-success',
    badge: 'border-success/30 bg-success/5 text-success',
  },
  stopped: {
    dot: 'bg-text-muted',
    badge: 'border-border-base bg-surface-2 text-text-muted',
  },
  failed: {
    dot: 'bg-danger',
    badge: 'border-danger/30 bg-danger/5 text-danger',
  },
};

const defaultStatusColor: StatusColor = {
  dot: 'bg-text-muted',
  badge: 'border-border-base bg-surface-2 text-text-muted',
};

const getStatusColor = (status: string): StatusColor => {
  return statusColors[status] ?? defaultStatusColor;
};

export type { StatusColor };
export { extractRepoName, getStatusColor };
