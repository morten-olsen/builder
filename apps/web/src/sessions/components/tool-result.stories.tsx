import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToolResult } from './tool-result.js';

const meta: Meta<typeof ToolResult> = {
  title: 'Composite/ToolResult',
  component: ToolResult,
};

type Story = StoryObj<typeof ToolResult>;

const BashOutput: Story = {
  args: {
    toolName: 'Bash',
    output: 'PASS src/auth.test.ts\n  ✓ validates tokens (3ms)\n  ✓ rejects expired tokens (1ms)\n  ✓ handles missing header (2ms)\n\nTest Suites: 1 passed, 1 total\nTests: 3 passed, 3 total\nTime: 0.45s',
  },
};

const ShortOutput: Story = {
  args: {
    toolName: 'Read',
    output: 'File contents read successfully.',
  },
};

const LongOutput: Story = {
  args: {
    toolName: 'Bash',
    output: Array.from({ length: 50 }, (_, i) => `line ${i + 1}: some output content here`).join('\n'),
  },
};

const JsonOutput: Story = {
  args: {
    toolName: 'Grep',
    output: {
      files: [
        'src/auth/auth.ts',
        'src/auth/auth.test.ts',
        'src/middleware/auth-guard.ts',
      ],
      matchCount: 12,
    },
  },
};

export default meta;
export { BashOutput, ShortOutput, LongOutput, JsonOutput };
