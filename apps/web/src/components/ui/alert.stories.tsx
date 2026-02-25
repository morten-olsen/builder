import type { Meta, StoryObj } from '@storybook/react-vite';

import { Alert } from './alert.js';
import { Button } from './button.js';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
};

type Story = StoryObj<typeof Alert>;

const Info: Story = {
  args: { color: 'info', children: 'Waiting for input...' },
};

const Success: Story = {
  args: { color: 'success', children: 'Session completed.' },
};

const Danger: Story = {
  args: { color: 'danger', children: 'Unknown error occurred.' },
};

const Warning: Story = {
  args: { color: 'warning', children: 'Identity key is stale.' },
};

const WithAction: Story = {
  render: () => (
    <Alert color="success">
      <p>Session completed.</p>
      <Button variant="ghost" color="warning" size="sm" className="mt-2">
        revert to before this run
      </Button>
    </Alert>
  ),
};

const AllColors: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Alert color="info">Waiting for input...</Alert>
      <Alert color="success">Session completed successfully.</Alert>
      <Alert color="danger">Failed to connect to repository.</Alert>
      <Alert color="warning">3 stale reviews detected.</Alert>
    </div>
  ),
};

export default meta;
export { Info, Success, Danger, Warning, WithAction, AllColors };
