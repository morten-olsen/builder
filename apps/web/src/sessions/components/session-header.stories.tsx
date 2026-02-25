import type { Meta, StoryObj } from '@storybook/react-vite';

import { SessionHeader } from './session-header.js';

const meta: Meta<typeof SessionHeader> = {
  title: 'Composite/SessionHeader',
  component: SessionHeader,
  decorators: [
    (Story) => (
      <div className="border border-border-base">
        <Story />
      </div>
    ),
  ],
};

type Story = StoryObj<typeof SessionHeader>;

const Running: Story = {
  args: {
    sessionId: 'abc12345-6789-def0-1234-567890abcdef',
    status: 'running',
    prompt: 'Refactor the authentication module to use JWT tokens',
    isRunning: true,
    isActive: true,
    onInterrupt: () => console.log('interrupt'),
    isInterrupting: false,
    onStop: () => console.log('stop'),
    isStopping: false,
  },
};

const WaitingForInput: Story = {
  args: {
    sessionId: 'abc12345-6789-def0-1234-567890abcdef',
    status: 'waiting_for_input',
    prompt: 'Add rate limiting to API endpoints',
    isRunning: false,
    isActive: true,
    onInterrupt: () => {},
    isInterrupting: false,
    onStop: () => console.log('stop'),
    isStopping: false,
  },
};

const Completed: Story = {
  args: {
    sessionId: 'abc12345-6789-def0-1234-567890abcdef',
    status: 'completed',
    prompt: 'Fix the login bug on mobile',
    isRunning: false,
    isActive: false,
    onInterrupt: () => {},
    isInterrupting: false,
    onStop: () => {},
    isStopping: false,
  },
};

const Failed: Story = {
  args: {
    sessionId: 'abc12345-6789-def0-1234-567890abcdef',
    status: 'failed',
    prompt: 'Deploy to production',
    isRunning: false,
    isActive: false,
    onInterrupt: () => {},
    isInterrupting: false,
    onStop: () => {},
    isStopping: false,
  },
};

export default meta;
export { Running, WaitingForInput, Completed, Failed };
