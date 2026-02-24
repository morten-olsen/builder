import { Link } from '@tanstack/react-router';

import { StatusDot } from '../ui/status-dot.js';
import { extractRepoName } from '../../utils/session.js';

type SidebarSessionItemProps = {
  id: string;
  status: string;
  repoUrl: string;
  branch: string;
  prompt: string;
  isActive: boolean;
  onClick?: () => void;
};

const SidebarSessionItem = ({
  id,
  status,
  repoUrl,
  branch,
  prompt,
  isActive,
  onClick,
}: SidebarSessionItemProps): React.ReactNode => {
  const repoName = extractRepoName(repoUrl);

  return (
    <Link
      to="/sessions/$sessionId"
      params={{ sessionId: id }}
      onClick={onClick}
      className={`mx-1 flex items-start gap-2 rounded px-2 py-1.5 transition-colors ${
        isActive
          ? 'bg-accent-subtle text-accent-bright'
          : 'text-text-dim hover:bg-surface-2 hover:text-text-base'
      }`}
    >
      <div className="mt-1.5 shrink-0">
        <StatusDot status={status} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs text-text-base">{prompt}</p>
        <p className="mt-0.5 truncate font-mono text-ui text-text-muted">
          {repoName} / {branch}
        </p>
      </div>
    </Link>
  );
};

export type { SidebarSessionItemProps };
export { SidebarSessionItem };
