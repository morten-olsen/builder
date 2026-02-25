import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input, Textarea } from './input.js';
import { Label } from './label.js';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
};

type Story = StoryObj<typeof Input>;

const Default: Story = {
  args: { placeholder: 'you@example.com' },
};

const Small: Story = {
  args: { inputSize: 'sm', placeholder: 'main' },
};

const Disabled: Story = {
  args: { disabled: true, value: 'locked value' },
};

const WithLabel: Story = {
  render: () => (
    <div>
      <Label htmlFor="demo">Email</Label>
      <Input id="demo" type="email" placeholder="you@example.com" />
    </div>
  ),
};

const TextareaDefault: StoryObj<typeof Textarea> = {
  render: () => <Textarea rows={3} placeholder="describe what the agent should do..." />,
};

const FormComposition: Story = {
  render: () => (
    <div className="max-w-sm space-y-3">
      <div>
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea id="prompt" rows={3} placeholder="describe what the agent should do..." />
      </div>
      <div>
        <Label htmlFor="branch">Branch (optional)</Label>
        <Input id="branch" inputSize="sm" placeholder="main" />
      </div>
    </div>
  ),
};

export default meta;
export { Default, Small, Disabled, WithLabel, TextareaDefault, FormComposition };
