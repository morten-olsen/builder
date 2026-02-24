import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select } from './select.js';
import { Label } from './label.js';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
};

type Story = StoryObj<typeof Select>;

const repoOptions = [
  { value: '1', label: 'my-project — git@github.com:org/repo.git' },
  { value: '2', label: 'builder — git@github.com:org/builder.git' },
  { value: '3', label: 'design-system — git@github.com:org/ds.git' },
];

const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="w-72">
        <Select
          options={repoOptions}
          value={value}
          onValueChange={setValue}
          placeholder="select a repo..."
        />
      </div>
    );
  },
};

const WithLabel: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="w-72">
        <Label>Repository</Label>
        <Select
          options={repoOptions}
          value={value}
          onValueChange={setValue}
          placeholder="select a repo..."
        />
      </div>
    );
  },
};

const Small: Story = {
  render: () => {
    const [value, setValue] = useState('1');
    return (
      <div className="w-48">
        <Select
          options={repoOptions}
          value={value}
          onValueChange={setValue}
          selectSize="sm"
        />
      </div>
    );
  },
};

const WithDisabledOption: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="w-72">
        <Select
          options={[
            ...repoOptions,
            { value: '4', label: 'archived-repo (read-only)', disabled: true },
          ]}
          value={value}
          onValueChange={setValue}
          placeholder="select a repo..."
        />
      </div>
    );
  },
};

const Disabled: Story = {
  render: () => (
    <div className="w-72">
      <Select
        options={repoOptions}
        value="1"
        onValueChange={() => {}}
        disabled
      />
    </div>
  ),
};

export default meta;
export { Default, WithLabel, Small, WithDisabledOption, Disabled };
