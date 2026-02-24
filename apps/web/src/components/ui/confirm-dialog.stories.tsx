import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmDialog } from './confirm-dialog.js';
import { Button } from './button.js';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
};

type Story = StoryObj<typeof ConfirmDialog>;

const DeleteRepo: Story = {
  render: () => (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" color="danger" size="sm">
          delete
        </Button>
      }
      title="Delete this repo?"
      description="This action cannot be undone. All sessions for this repo will also be removed."
      confirmLabel="delete"
      confirmColor="danger"
      onConfirm={() => console.log('deleted')}
    />
  ),
};

const DeleteIdentity: Story = {
  render: () => (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" color="danger" size="sm">
          delete identity
        </Button>
      }
      title="Delete this identity?"
      confirmLabel="delete"
      confirmColor="danger"
      onConfirm={() => console.log('deleted')}
    />
  ),
};

export default meta;
export { DeleteRepo, DeleteIdentity };
