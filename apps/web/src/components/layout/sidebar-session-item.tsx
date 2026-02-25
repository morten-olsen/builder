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
  pinnedAt?: string | null;
  onTogglePin?: (sessionId: string, pinned: boolean) => void;
  onClick?: () => void;
};

const SidebarSessionItem = ({
  id,
  status,
  repoUrl,
  branch,
  prompt,
  isActive,
  pinnedAt,
  onTogglePin,
  onClick,
}: SidebarSessionItemProps): React.ReactNode => {
  const repoName = extractRepoName(repoUrl);
  const isPinned = !!pinnedAt;

  return (
    <div
      className={`mx-1 flex items-start gap-2 rounded px-2 py-1.5 transition-colors ${
        isActive
          ? 'bg-accent-subtle text-accent-bright'
          : 'text-text-dim hover:bg-surface-2 hover:text-text-base'
      }`}
    >
      <Link
        to="/sessions/$sessionId"
        params={{ sessionId: id }}
        onClick={onClick}
        className="flex min-w-0 flex-1 items-start gap-2"
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
      {onTogglePin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(id, !isPinned);
          }}
          title={isPinned ? 'Unpin' : 'Pin'}
          className={`mt-1 shrink-0 p-0.5 transition-colors ${
            isPinned
              ? 'text-accent hover:text-accent-bright'
              : 'text-text-muted/40 hover:text-text-muted'
          }`}
        >
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.456.734a1.75 1.75 0 0 1 2.826.504l.613 1.327a3.08 3.08 0 0 0 2.084 1.707l2.454.584c1.332.317 1.8 1.972.832 2.94L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-2.204 2.205c-.968.968-2.623.5-2.94-.832l-.584-2.454a3.08 3.08 0 0 0-1.707-2.084l-1.327-.613a1.75 1.75 0 0 1-.504-2.826L4.456.734Z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export type { SidebarSessionItemProps };
export { SidebarSessionItem };
