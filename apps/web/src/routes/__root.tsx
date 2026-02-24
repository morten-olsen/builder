import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

import type { AuthState } from '../auth/auth';

type RouterContext = {
  auth: AuthState;
  queryClient: QueryClient;
};

const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

export { Route };
