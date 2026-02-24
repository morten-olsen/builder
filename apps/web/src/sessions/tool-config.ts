type ToolCategory = 'terminal' | 'file' | 'search' | 'default';

type ToolDisplayConfig = {
  category: ToolCategory;
  label: string;
  borderColor: string;
};

const toolRegistry: Record<string, ToolDisplayConfig> = {
  Bash: { category: 'terminal', label: 'Terminal', borderColor: 'border-success/40' },
  Read: { category: 'file', label: 'Read File', borderColor: 'border-info/40' },
  Edit: { category: 'file', label: 'Edit File', borderColor: 'border-accent/40' },
  Write: { category: 'file', label: 'Write File', borderColor: 'border-accent/40' },
  Grep: { category: 'search', label: 'Search', borderColor: 'border-text-muted/30' },
  Glob: { category: 'search', label: 'Find Files', borderColor: 'border-text-muted/30' },
  WebSearch: { category: 'search', label: 'Web Search', borderColor: 'border-info/40' },
  WebFetch: { category: 'file', label: 'Fetch URL', borderColor: 'border-info/40' },
  Task: { category: 'default', label: 'Task', borderColor: 'border-accent/30' },
};

const getToolConfig = (toolName: string): ToolDisplayConfig =>
  toolRegistry[toolName] ?? {
    category: 'default' as const,
    label: toolName,
    borderColor: 'border-border-base',
  };

export type { ToolCategory, ToolDisplayConfig };
export { getToolConfig };
