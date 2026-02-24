type ToolSearchProps = {
  toolName: string;
  input: Record<string, unknown>;
};

const ToolSearch = ({ toolName, input }: ToolSearchProps): React.ReactNode => {
  const pattern =
    typeof input.pattern === 'string'
      ? input.pattern
      : typeof input.query === 'string'
        ? input.query
        : undefined;
  const path = typeof input.path === 'string' ? input.path : undefined;

  return (
    <div className="overflow-hidden rounded bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-2 font-mono text-ui">
        <span className="text-text-muted">{toolName === 'Glob' ? 'glob' : 'grep'}</span>
        {pattern && <span className="text-accent-bright">{pattern}</span>}
        {path && <span className="text-text-muted">{path}</span>}
      </div>
    </div>
  );
};

export { ToolSearch };
