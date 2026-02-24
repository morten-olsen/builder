type ToolBashProps = {
  input: Record<string, unknown>;
};

const ToolBash = ({ input }: ToolBashProps): React.ReactNode => {
  const command = typeof input.command === 'string' ? input.command : '';
  const description = typeof input.description === 'string' ? input.description : undefined;

  return (
    <div className="overflow-hidden rounded bg-[#0d1117]">
      {description && (
        <div className="border-b border-surface-3 px-3 py-1.5 font-mono text-fine text-text-muted">
          {description}
        </div>
      )}
      <div className="px-3 py-2">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-success">
          <span className="select-none text-success/50">$ </span>
          {command}
        </pre>
      </div>
    </div>
  );
};

export { ToolBash };
