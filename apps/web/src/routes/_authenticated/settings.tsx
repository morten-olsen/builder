import { createFileRoute, Link, Outlet, useMatches } from '@tanstack/react-router';

const tabs = [
  { to: '/settings/repos' as const, label: 'Repos' },
  { to: '/settings/identities' as const, label: 'Identities' },
  { to: '/settings/notifications' as const, label: 'Notifications' },
  { to: '/settings/security' as const, label: 'Security' },
];

const SettingsLayout = (): React.ReactNode => {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? '';

  return (
    <div className="p-3 lg:p-5">
      <div className="mb-4">
        <h1 className="font-condensed text-lg font-semibold uppercase tracking-wider text-text-bright">Settings</h1>
        <div className="mt-2 flex gap-0 border-b border-border-base">
          {tabs.map((tab) => {
            const isActive = currentPath.includes(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`border-b-2 px-3 py-1.5 font-mono text-xs transition-colors ${
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-dim'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <Outlet />
    </div>
  );
};

const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsLayout,
});

export { Route };
