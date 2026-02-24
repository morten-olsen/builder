import { createFileRoute, redirect } from '@tanstack/react-router';

const Route = createFileRoute('/_authenticated/repos/$repoId')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/settings/repos/$repoId', params: { repoId: params.repoId } });
  },
});

export { Route };
