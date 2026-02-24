import { createFileRoute, Outlet } from '@tanstack/react-router';

const SessionsLayout = (): React.ReactNode => {
  return <Outlet />;
};

const Route = createFileRoute('/_authenticated/sessions')({
  component: SessionsLayout,
});

export { Route };
