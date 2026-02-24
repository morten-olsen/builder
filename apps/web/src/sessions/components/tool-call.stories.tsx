import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToolCall } from './tool-call.js';

const meta: Meta<typeof ToolCall> = {
  title: 'Composite/ToolCall',
  component: ToolCall,
};

type Story = StoryObj<typeof ToolCall>;

const BashCommand: Story = {
  args: {
    tool: 'Bash',
    input: { command: 'git diff --stat HEAD~3', description: 'Show recent changes' },
  },
};

const ReadFile: Story = {
  args: {
    tool: 'Read',
    input: { file_path: '/src/services/auth/auth.ts' },
  },
};

const EditFile: Story = {
  args: {
    tool: 'Edit',
    input: {
      file_path: '/src/services/auth/auth.ts',
      old_string: 'const token = jwt.sign(payload);',
      new_string: 'const token = jwt.sign(payload, { expiresIn: "1h" });',
    },
  },
};

const WriteFile: Story = {
  args: {
    tool: 'Write',
    input: {
      file_path: '/src/utils/validate.ts',
      content: 'export const isEmail = (s: string): boolean =>\n  /^[^@]+@[^@]+\\.[^@]+$/.test(s);\n',
    },
  },
};

const GrepSearch: Story = {
  args: {
    tool: 'Grep',
    input: { pattern: 'authenticate', path: '/src' },
  },
};

const GlobSearch: Story = {
  args: {
    tool: 'Glob',
    input: { pattern: '**/*.test.ts' },
  },
};

const UnknownTool: Story = {
  args: {
    tool: 'CustomTool',
    input: { action: 'deploy', target: 'staging' },
  },
};

export default meta;
export { BashCommand, ReadFile, EditFile, WriteFile, GrepSearch, GlobSearch, UnknownTool };
