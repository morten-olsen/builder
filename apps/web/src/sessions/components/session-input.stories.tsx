import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/ui/button.js';

import { SessionInput } from './session-input.js';

const meta: Meta<typeof SessionInput> = {
  title: 'Composite/SessionInput',
  component: SessionInput,
};

type Story = StoryObj<typeof SessionInput>;

const Default: Story = {
  args: {
    onSend: (msg) => console.log('send:', msg),
    isSending: false,
  },
};

const Sending: Story = {
  args: {
    onSend: () => {},
    isSending: true,
  },
};

const WithActions: Story = {
  args: {
    onSend: (msg) => console.log('send:', msg),
    isSending: false,
    actions: (
      <>
        <Button variant="ghost" color="accent" size="sm">interrupt</Button>
        <Button variant="ghost" color="danger" size="sm">end</Button>
      </>
    ),
  },
};

export default meta;
export { Default, Sending, WithActions };
