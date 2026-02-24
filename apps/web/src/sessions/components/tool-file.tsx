type ToolFileProps = {
  toolName: string;
  input: Record<string, unknown>;
};

const ToolFile = ({ toolName, input }: ToolFileProps): React.ReactNode => {
  const filePath =
    typeof input.file_path === 'string'
      ? input.file_path
      : typeof input.filePath === 'string'
        ? input.filePath
        : typeof input.path === 'string'
          ? input.path
          : undefined;

  const fileName = filePath?.split('/').pop() ?? filePath;

  if (toolName === 'Edit' && typeof input.old_string === 'string') {
    return (
      <div className="overflow-hidden rounded bg-surface-2">
        {fileName && (
          <div className="border-b border-border-dim px-3 py-1.5 font-mono text-fine text-text-dim">
            {fileName}
          </div>
        )}
        <div className="px-3 py-2 font-mono text-ui leading-relaxed">
          {input.old_string.split('\n').map((line, i) => (
            <div key={`old-${i}`} className="text-danger/70">
              <span className="select-none text-danger/40">- </span>
              {line}
            </div>
          ))}
          {typeof input.new_string === 'string' &&
            input.new_string.split('\n').map((line, i) => (
              <div key={`new-${i}`} className="text-success/70">
                <span className="select-none text-success/40">+ </span>
                {line}
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded bg-surface-2">
      {fileName && (
        <div className="border-b border-border-dim px-3 py-1.5 font-mono text-fine text-text-dim">
          {fileName}
        </div>
      )}
      {typeof input.content === 'string' && (
        <div className="max-h-48 overflow-y-auto px-3 py-2">
          <pre className="font-mono text-ui leading-relaxed text-text-muted">
            {input.content.slice(0, 2000)}
            {input.content.length > 2000 ? '\n...' : ''}
          </pre>
        </div>
      )}
    </div>
  );
};

export { ToolFile };
