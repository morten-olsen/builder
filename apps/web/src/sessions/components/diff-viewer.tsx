import { DiffEditor } from '@monaco-editor/react';

type DiffViewerProps = {
  filePath: string | null;
  baseRef: string;
  compareRef: string;
  original: string | null;
  modified: string | null;
  isReviewed: boolean;
  isStale: boolean;
  onMarkReviewed: () => void;
  onUnmarkReviewed: () => void;
  renderSideBySide?: boolean;
};

const extToLanguage: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  yaml: 'yaml',
  yml: 'yaml',
  py: 'python',
  rs: 'rust',
  go: 'go',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  toml: 'ini',
  env: 'ini',
  dockerfile: 'dockerfile',
};

const getLanguage = (filePath: string): string => {
  const name = filePath.split('/').pop() ?? '';
  const lower = name.toLowerCase();

  if (lower === 'dockerfile') return 'dockerfile';
  if (lower === 'makefile') return 'makefile';

  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return extToLanguage[ext] ?? 'plaintext';
};

const DiffViewer = ({
  filePath,
  baseRef,
  compareRef,
  original,
  modified,
  isReviewed,
  isStale,
  onMarkReviewed,
  onUnmarkReviewed,
  renderSideBySide = true,
}: DiffViewerProps): React.ReactNode => {
  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs text-text-muted">select a file to view diff</p>
      </div>
    );
  }

  const language = getLanguage(filePath);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-base px-4 py-2">
        <div className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs text-text-bright">{filePath}</span>
          <span className="font-mono text-fine text-text-muted">
            {baseRef} &rarr; {compareRef}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isReviewed && isStale && (
            <span className="rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-fine text-warning">
              stale
            </span>
          )}
          {isReviewed ? (
            <button
              onClick={onUnmarkReviewed}
              className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-ui text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
            >
              reviewed
            </button>
          ) : (
            <button
              onClick={onMarkReviewed}
              className="rounded border border-border-base px-2.5 py-1 font-mono text-ui text-text-muted transition-colors hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
            >
              mark reviewed
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DiffEditor
          original={original ?? ''}
          modified={modified ?? ''}
          language={language}
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: 'on',
            folding: false,
            wordWrap: 'off',
            renderOverviewRuler: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export { DiffViewer };
