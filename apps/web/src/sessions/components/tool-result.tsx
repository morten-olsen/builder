type ToolResultProps = {
  toolName: string;
  output: unknown;
};

const formatOutput = (output: unknown): string => {
  if (typeof output === 'string') return output;
  return JSON.stringify(output, null, 2);
};

const ToolResult = ({ toolName, output }: ToolResultProps): React.ReactNode => {
  const text = formatOutput(output);
  const isBash = toolName === 'Bash';

  return (
    <details className="group">
      <summary className="cursor-pointer select-none py-1 font-mono text-ui text-text-muted hover:text-text-dim">
        <span className="ml-1">output</span>
      </summary>
      <div
        className={`mt-1 max-h-64 overflow-y-auto rounded px-3 py-2 ${isBash ? 'bg-[#080c12]' : 'bg-surface-2'}`}
      >
        <pre
          className={`whitespace-pre-wrap font-mono text-ui leading-relaxed ${isBash ? 'text-text-dim' : 'text-text-muted'}`}
        >
          {text.slice(0, 5000)}
          {text.length > 5000 ? '\n...' : ''}
        </pre>
      </div>
    </details>
  );
};

export { ToolResult };
