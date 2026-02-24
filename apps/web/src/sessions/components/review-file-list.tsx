type ReviewFileEntry = {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  oldPath: string | null;
  isReviewed: boolean;
  isStale: boolean;
  reviewedAt: string | null;
};

type ReviewSummary = {
  total: number;
  reviewed: number;
  stale: number;
};

type ReviewFileListProps = {
  files: ReviewFileEntry[];
  summary: ReviewSummary;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onToggleReview: (path: string, isReviewed: boolean) => void;
};

const statusStyles: Record<ReviewFileEntry['status'], string> = {
  added: 'text-success',
  modified: 'text-accent',
  deleted: 'text-danger',
  renamed: 'text-info',
};

const statusLetters: Record<ReviewFileEntry['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
};

const fileName = (filePath: string): { name: string; dir: string } => {
  const parts = filePath.split('/');
  const name = parts.pop() ?? filePath;
  const dir = parts.join('/');
  return { name, dir };
};

const ReviewFileList = ({
  files,
  summary,
  selectedFile,
  onSelectFile,
  onToggleReview,
}: ReviewFileListProps): React.ReactNode => (
  <div className="flex h-full flex-col">
    <div className="shrink-0 border-b border-border-base px-2.5 py-1.5">
      <div className="flex items-center justify-between font-mono text-ui">
        <span className="text-text-muted">
          {summary.reviewed}/{summary.total} reviewed
        </span>
        {summary.stale > 0 && (
          <span className="text-warning">{summary.stale} stale</span>
        )}
      </div>
      {summary.total > 0 && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(summary.reviewed / summary.total) * 100}%` }}
          />
        </div>
      )}
    </div>
    <div className="flex-1 overflow-y-auto">
      {files.map((file) => {
        const { name, dir } = fileName(file.path);
        const isSelected = file.path === selectedFile;

        return (
          <div
            key={file.path}
            className={`flex cursor-pointer items-center gap-2 border-b border-border-dim px-2.5 py-1.5 transition-colors hover:bg-surface-2 ${
              isSelected ? 'bg-surface-2' : ''
            }`}
            onClick={() => onSelectFile(file.path)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleReview(file.path, file.isReviewed);
              }}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border font-mono text-[9px] ${
                file.isReviewed && !file.isStale
                  ? 'border-accent bg-accent text-surface-0'
                  : file.isReviewed && file.isStale
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-border-base bg-surface-2 text-transparent'
              }`}
            >
              {file.isReviewed ? (file.isStale ? '!' : '\u2713') : ''}
            </button>
            <span className={`shrink-0 font-mono text-fine font-medium ${statusStyles[file.status]}`}>
              {statusLetters[file.status]}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-mono text-xs text-text-bright">{name}</span>
              {dir && (
                <span className="block truncate font-mono text-fine text-text-muted">{dir}</span>
              )}
            </div>
            <div className="shrink-0 font-mono text-fine">
              {file.additions > 0 && <span className="text-success">+{file.additions}</span>}
              {file.additions > 0 && file.deletions > 0 && <span className="text-text-muted">/</span>}
              {file.deletions > 0 && <span className="text-danger">-{file.deletions}</span>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export type { ReviewFileEntry, ReviewSummary };
export { ReviewFileList };
