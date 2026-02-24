import { createFileRoute, Outlet } from '@tanstack/react-router';

const ReposLayout = (): React.ReactNode => {
  return <Outlet />;
};

const Route = createFileRoute('/_authenticated/repos')({
  component: ReposLayout,
});

export { Route };
