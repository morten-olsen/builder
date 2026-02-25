import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label.js';
import { Input } from './input.js';

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
};

type Story = StoryObj<typeof Label>;

const Default: Story = {
  args: { children: 'Email' },
};

const WithInput: Story = {
  render: () => (
    <div>
      <Label htmlFor="email-field">Email</Label>
      <Input id="email-field" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export default meta;
export { Default, WithInput };
