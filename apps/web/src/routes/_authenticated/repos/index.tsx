import { createFileRoute, redirect } from '@tanstack/react-router';

const Route = createFileRoute('/_authenticated/repos/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/repos' });
  },
});

export { Route };
