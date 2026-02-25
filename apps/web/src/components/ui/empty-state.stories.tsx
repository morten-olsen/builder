import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState } from './empty-state.js';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
};

type Story = StoryObj<typeof EmptyState>;

const TitleOnly: Story = {
  args: { title: 'No active sessions' },
};

const WithDescription: Story = {
  args: {
    title: 'no repos yet',
    description: 'create one to start coding sessions',
  },
};

const WithLink: Story = {
  args: {
    title: 'No repos configured',
    description: (
      <>
        add a repo in{' '}
        <a href="#" className="text-accent hover:text-accent-bright">settings</a>
        {' '}to start a session
      </>
    ),
  },
};

export default meta;
export { TitleOnly, WithDescription, WithLink };
