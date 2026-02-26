import { useState } from 'react';

import { Badge } from '../ui/badge.js';

type SidebarSectionProps = {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

const SidebarSection = ({
  title,
  count,
  defaultOpen = true,
  children,
}: SidebarSectionProps): React.ReactNode => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <svg
          className={`h-3 w-3 shrink-0 text-text-muted transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M4.5 2l4 4-4 4V2z" />
        </svg>
        <span className="font-condensed font-semibold text-ui uppercase tracking-wider text-text-muted">
          {title}
        </span>
        {count > 0 && (
          <span className="ml-auto">
            <Badge variant="count">{count}</Badge>
          </span>
        )}
      </button>
      {open && <div className="pb-0.5">{children}</div>}
    </div>
  );
};

export type { SidebarSectionProps };
export { SidebarSection };
