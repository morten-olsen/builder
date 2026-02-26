const extractRepoName = (repoUrl: string): string => {
  return repoUrl.split('/').pop()?.replace('.git', '') ?? repoUrl;
};

type StatusColor = {
  dot: string;
  dotBase: string;
  badge: string;
};

const statusColors: Record<string, StatusColor> = {
  running: {
    dot: 'bg-accent',
    dotBase: 'bg-accent',
    badge: 'border-accent/30 bg-accent-subtle text-accent',
  },
  pending: {
    dot: 'bg-accent',
    dotBase: 'bg-accent',
    badge: 'border-accent/20 bg-accent-subtle text-accent-dim',
  },
  waiting_for_input: {
    dot: 'bg-warning',
    dotBase: 'bg-warning',
    badge: 'border-warning/30 bg-warning/5 text-warning',
  },
  idle: {
    dot: 'bg-text-muted',
    dotBase: 'bg-text-muted',
    badge: 'border-border-base bg-surface-2 text-text-muted',
  },
  reverted: {
    dot: 'bg-info',
    dotBase: 'bg-info',
    badge: 'border-info/30 bg-info/5 text-info',
  },
  completed: {
    dot: 'bg-success',
    dotBase: 'bg-success',
    badge: 'border-success/30 bg-success/5 text-success',
  },
  stopped: {
    dot: 'bg-text-muted',
    dotBase: 'bg-text-muted',
    badge: 'border-border-base bg-surface-2 text-text-muted',
  },
  failed: {
    dot: 'bg-danger',
    dotBase: 'bg-danger',
    badge: 'border-danger/30 bg-danger/5 text-danger',
  },
};

const defaultStatusColor: StatusColor = {
  dot: 'bg-text-muted',
  dotBase: 'bg-text-muted',
  badge: 'border-border-base bg-surface-2 text-text-muted',
};

const getStatusColor = (status: string): StatusColor => {
  return statusColors[status] ?? defaultStatusColor;
};

export type { StatusColor };
export { extractRepoName, getStatusColor };
