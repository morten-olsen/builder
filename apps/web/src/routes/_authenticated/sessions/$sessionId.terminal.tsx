import { createFileRoute } from '@tanstack/react-router';

import { TerminalPanel } from '../../../sessions/components/terminal-panel.js';

const TerminalPage = (): React.ReactNode => {
  const { sessionId } = Route.useParams();

  return <TerminalPanel sessionId={sessionId} />;
};

const Route = createFileRoute('/_authenticated/sessions/$sessionId/terminal')({
  component: TerminalPage,
});

export { Route };
