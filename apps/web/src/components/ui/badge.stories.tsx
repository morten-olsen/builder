import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge.js';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
};

type Story = StoryObj<typeof Badge>;

const StatusAccent: Story = {
  args: { variant: 'status', color: 'accent', children: 'running' },
};

const StatusSuccess: Story = {
  args: { variant: 'status', color: 'success', children: 'completed' },
};

const StatusDanger: Story = {
  args: { variant: 'status', color: 'danger', children: 'failed' },
};

const StatusInfo: Story = {
  args: { variant: 'status', color: 'info', children: 'waiting' },
};

const StatusWarning: Story = {
  args: { variant: 'status', color: 'warning', children: 'stale' },
};

const StatusNeutral: Story = {
  args: { variant: 'status', color: 'neutral', children: 'stopped' },
};

const Count: Story = {
  args: { variant: 'count', children: '3' },
};

const Tag: Story = {
  args: { variant: 'tag', children: 'main' },
};

const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant="status" color="accent">running</Badge>
        <Badge variant="status" color="success">completed</Badge>
        <Badge variant="status" color="danger">failed</Badge>
        <Badge variant="status" color="info">waiting</Badge>
        <Badge variant="status" color="warning">stale</Badge>
        <Badge variant="status" color="neutral">stopped</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="count">3</Badge>
        <Badge variant="count">12</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="tag">main</Badge>
        <Badge variant="tag">feature/auth</Badge>
      </div>
    </div>
  ),
};

export default meta;
export { StatusAccent, StatusSuccess, StatusDanger, StatusInfo, StatusWarning, StatusNeutral, Count, Tag, AllVariants };
