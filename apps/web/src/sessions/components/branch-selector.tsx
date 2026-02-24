type BranchSelectorProps = {
  branches: string[];
  baseBranch: string;
  value: string;
  onChange: (branch: string) => void;
};

const BranchSelector = ({
  branches,
  baseBranch,
  value,
  onChange,
}: BranchSelectorProps): React.ReactNode => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="rounded border border-border-base bg-surface-2 px-2 py-1 font-mono text-ui text-text-bright focus:border-accent-dim focus:outline-none"
  >
    {branches.map((branch) => (
      <option key={branch} value={branch}>
        {branch}
        {branch === baseBranch ? ' (base)' : ''}
      </option>
    ))}
  </select>
);

export { BranchSelector };
