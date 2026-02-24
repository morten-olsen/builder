import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
};

type Story = StoryObj<typeof Button>;

const Primary: Story = {
  args: { variant: 'primary', children: 'start session' },
};

const PrimarySm: Story = {
  args: { variant: 'primary', size: 'sm', children: 'send' },
};

const Secondary: Story = {
  args: { variant: 'secondary', children: '+ new repo' },
};

const SecondarySm: Story = {
  args: { variant: 'secondary', size: 'sm', children: 'push' },
};

const GhostAccent: Story = {
  args: { variant: 'ghost', color: 'accent', children: 'interrupt' },
};

const GhostDanger: Story = {
  args: { variant: 'ghost', color: 'danger', children: 'end' },
};

const GhostWarning: Story = {
  args: { variant: 'ghost', color: 'warning', children: 'revert' },
};

const GhostSmall: Story = {
  args: { variant: 'ghost', color: 'danger', size: 'sm', children: 'end' },
};

const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'starting...' },
};

const FullWidth: Story = {
  args: { variant: 'primary', fullWidth: true, children: 'sign in' },
};

const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="primary">primary md</Button>
        <Button variant="primary" size="sm">primary sm</Button>
        <Button variant="primary" disabled>disabled</Button>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary">secondary md</Button>
        <Button variant="secondary" size="sm">secondary sm</Button>
        <Button variant="secondary" disabled>disabled</Button>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" color="accent">ghost accent</Button>
        <Button variant="ghost" color="danger">ghost danger</Button>
        <Button variant="ghost" color="warning">ghost warning</Button>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" color="accent" size="sm">sm accent</Button>
        <Button variant="ghost" color="danger" size="sm">sm danger</Button>
        <Button variant="ghost" color="warning" size="sm">sm warning</Button>
      </div>
    </div>
  ),
};

export default meta;
export { Primary, PrimarySm, Secondary, SecondarySm, GhostAccent, GhostDanger, GhostWarning, GhostSmall, Disabled, FullWidth, AllVariants };
