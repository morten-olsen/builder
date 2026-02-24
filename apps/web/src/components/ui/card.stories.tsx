import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card.js';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
};

type Story = StoryObj<typeof Card>;

const Default: Story = {
  args: {
    children: (
      <div>
        <p className="font-mono text-sm font-medium text-text-bright">my-project</p>
        <p className="mt-0.5 font-mono text-xs text-text-muted">git@github.com:org/repo.git</p>
      </div>
    ),
  },
};

const Interactive: Story = {
  args: {
    interactive: true,
    children: (
      <div>
        <p className="font-mono text-sm font-medium text-text-bright">my-project</p>
        <p className="mt-0.5 font-mono text-xs text-text-muted">git@github.com:org/repo.git</p>
      </div>
    ),
  },
};

const SmallPadding: Story = {
  args: {
    padding: 'sm',
    children: <p className="font-mono text-xs text-text-base">compact card content</p>,
  },
};

const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: (
      <div>
        <p className="font-mono text-sm text-text-bright">Form container</p>
        <p className="mt-1 font-mono text-xs text-text-muted">Large padding for forms and content areas.</p>
      </div>
    ),
  },
};

const AllPaddings: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Card padding="sm">
        <p className="font-mono text-xs text-text-base">padding: sm</p>
      </Card>
      <Card padding="md">
        <p className="font-mono text-xs text-text-base">padding: md</p>
      </Card>
      <Card padding="lg">
        <p className="font-mono text-xs text-text-base">padding: lg</p>
      </Card>
    </div>
  ),
};

export default meta;
export { Default, Interactive, SmallPadding, LargePadding, AllPaddings };
