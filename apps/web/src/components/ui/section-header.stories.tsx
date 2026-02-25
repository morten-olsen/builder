import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionHeader } from './section-header.js';

const meta: Meta<typeof SectionHeader> = {
  title: 'UI/SectionHeader',
  component: SectionHeader,
};

type Story = StoryObj<typeof SectionHeader>;

const Default: Story = {
  args: { children: 'Needs Attention' },
};

const Small: Story = {
  args: { size: 'sm', children: 'Running' },
};

const BothSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <SectionHeader size="sm">small — sidebar label</SectionHeader>
      <SectionHeader size="md">medium — section header</SectionHeader>
    </div>
  ),
};

export default meta;
export { Default, Small, BothSizes };
