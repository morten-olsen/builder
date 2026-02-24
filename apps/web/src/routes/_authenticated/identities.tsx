import { createFileRoute, redirect } from '@tanstack/react-router';

const Route = createFileRoute('/_authenticated/identities')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/identities' });
  },
});

export { Route };
