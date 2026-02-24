type EmptyStateProps = {
  title: string;
  description?: React.ReactNode;
};

const EmptyState = ({ title, description }: EmptyStateProps): React.ReactNode => (
  <div className="rounded-lg border border-border-dim bg-surface-1 py-12 text-center">
    <p className="font-mono text-sm text-text-dim">{title}</p>
    {description && (
      <p className="mt-1 font-mono text-xs text-text-muted">{description}</p>
    )}
  </div>
);

export type { EmptyStateProps };
export { EmptyState };
