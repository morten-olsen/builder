import type { Meta, StoryObj } from '@storybook/react-vite';

import type { SessionEventEntry } from '../use-session-events.js';

import { SessionEventItem } from './session-event-item.js';

const meta: Meta<typeof SessionEventItem> = {
  title: 'Composite/SessionEventItem',
  component: SessionEventItem,
};

type Story = StoryObj<typeof SessionEventItem>;

const AssistantOutput: Story = {
  args: {
    event: {
      id: 1,
      type: 'agent:output',
      data: { text: 'I\'ll help you refactor the authentication module. Let me start by reading the existing code.', messageType: 'text' },
    } as SessionEventEntry,
  },
};

const ToolUse: Story = {
  args: {
    event: {
      id: 2,
      type: 'agent:tool_use',
      data: { tool: 'Bash', input: { command: 'npm test', description: 'Run test suite' } },
    } as SessionEventEntry,
  },
};

const ToolResultOutput: Story = {
  args: {
    event: {
      id: 3,
      type: 'agent:tool_result',
      data: { tool: 'Bash', output: 'PASS src/auth.test.ts\n  ✓ validates tokens (3ms)\n  ✓ rejects expired tokens (1ms)\n\nTest Suites: 1 passed\nTests: 2 passed' },
    } as SessionEventEntry,
  },
};

const StatusChange: Story = {
  args: {
    event: {
      id: 4,
      type: 'session:status',
      data: { status: 'running' },
    } as SessionEventEntry,
  },
};

const WaitingForInput: Story = {
  args: {
    event: {
      id: 5,
      type: 'session:waiting_for_input',
      data: { prompt: 'Should I also update the tests?' },
    } as SessionEventEntry,
  },
};

const Completed: Story = {
  args: {
    event: {
      id: 6,
      type: 'session:completed',
      data: { summary: 'Refactored auth module and updated 5 tests.' },
    } as SessionEventEntry,
    snapshotMessageId: 'msg-123',
    onRevert: () => console.log('revert'),
    isReverting: false,
  },
};

const ErrorEvent: Story = {
  args: {
    event: {
      id: 7,
      type: 'session:error',
      data: { error: 'Rate limit exceeded. Please try again in 60 seconds.' },
    } as SessionEventEntry,
  },
};

export default meta;
export { AssistantOutput, ToolUse, ToolResultOutput, StatusChange, WaitingForInput, Completed, ErrorEvent };
