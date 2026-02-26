import { useState, useCallback, useEffect } from 'react';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { EventStreamProvider } from '../contexts/event-stream.js';
import { useMediaQuery } from '../hooks/use-media-query.js';
import { Sidebar } from '../components/layout/sidebar.js';
import { MobileDrawer } from '../components/layout/mobile-drawer.js';

const LiveClock = (): React.ReactNode => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utc = time.toISOString().slice(11, 19);

  return <span>{utc} UTC</span>;
};

const AuthenticatedLayout = (): React.ReactNode => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <EventStreamProvider>
      <div className="min-h-screen bg-surface-0">
        {isDesktop ? (
          <>
            {/* Status bar */}
            <div className="fixed inset-x-0 top-0 z-40 flex h-6 items-center justify-between border-b border-border-dim bg-surface-1/80 px-4 backdrop-blur-sm">
              <span className="font-condensed text-ui font-semibold uppercase tracking-widest text-accent/70">
                Mission Control
              </span>
              <span className="font-mono text-ui text-text-muted">
                <LiveClock />
              </span>
            </div>

            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 w-64 border-r border-border-base pt-6">
              <Sidebar />
            </aside>
          </>
        ) : (
          <>
            {/* Mobile top bar */}
            <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border-base bg-surface-1 px-4">
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded text-text-dim hover:bg-surface-2 hover:text-text-base"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-5 w-5 items-center justify-center">
                  <div className="absolute inset-0 rotate-45 rounded-sm border border-accent/50" />
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>
                <span className="font-condensed text-sm font-semibold uppercase tracking-widest text-text-bright">
                  Builder
                </span>
              </div>
            </header>

            {/* Mobile drawer */}
            <MobileDrawer open={drawerOpen} onClose={closeDrawer}>
              <Sidebar onNavigate={closeDrawer} />
            </MobileDrawer>
          </>
        )}

        {/* Main content */}
        <main className={isDesktop ? 'fixed top-6 bottom-0 left-64 right-0 overflow-auto' : 'h-[calc(100dvh-3rem)] overflow-auto'}>
          <Outlet />
        </main>
      </div>
    </EventStreamProvider>
  );
};

const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AuthenticatedLayout,
});

export { Route };
