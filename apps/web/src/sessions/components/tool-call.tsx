import { getToolConfig } from '../tool-config.js';
import { ToolBash } from './tool-bash.js';
import { ToolFile } from './tool-file.js';
import { ToolSearch } from './tool-search.js';

type ToolCallProps = {
  tool: string;
  input: unknown;
};

const ToolCall = ({ tool, input }: ToolCallProps): React.ReactNode => {
  const config = getToolConfig(tool);
  const inputObj = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  const renderContent = (): React.ReactNode => {
    switch (config.category) {
      case 'terminal':
        return <ToolBash input={inputObj} />;
      case 'file':
        return <ToolFile toolName={tool} input={inputObj} />;
      case 'search':
        return <ToolSearch toolName={tool} input={inputObj} />;
      default:
        return (
          <pre className="max-h-32 overflow-y-auto rounded bg-surface-2 px-3 py-2 font-mono text-ui leading-relaxed text-text-muted">
            {JSON.stringify(input, null, 2)}
          </pre>
        );
    }
  };

  return (
    <details className="group" open>
      <summary
        className={`flex cursor-pointer select-none items-center gap-2 border-l-2 ${config.borderColor} py-1.5 pl-3 font-mono text-ui text-text-dim hover:text-text-base`}
      >
        <span>{config.label}</span>
      </summary>
      <div className="mt-1 pl-5">{renderContent()}</div>
    </details>
  );
};

export { ToolCall };
