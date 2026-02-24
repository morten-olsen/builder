import { useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getClient } from '../../../client/client.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { useMediaQuery } from '../../../hooks/use-media-query.js';
import { BranchSelector } from '../../../sessions/components/branch-selector.js';
import { DiffViewer } from '../../../sessions/components/diff-viewer.js';
import { ReviewFileList } from '../../../sessions/components/review-file-list.js';

const ReviewPage = (): React.ReactNode => {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const [compareRef, setCompareRef] = useState<string | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [showPush, setShowPush] = useState(false);
  const [pushBranch, setPushBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  const files = useQuery({
    queryKey: ['review-files', sessionId, compareRef],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/sessions/{sessionId}/review/files', {
        params: {
          path: { sessionId },
          query: { compareRef },
        },
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to load files');
      return data;
    },
  });

  const diff = useQuery({
    queryKey: ['review-diff', sessionId, selectedFile, compareRef],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/sessions/{sessionId}/review/diff', {
        params: {
          path: { sessionId },
          query: { path: selectedFile ?? undefined, compareRef },
        },
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to load diff');
      return data;
    },
    enabled: selectedFile !== null,
  });

  const branches = useQuery({
    queryKey: ['review-branches', sessionId],
    queryFn: async () => {
      const { data, error } = await getClient().api.GET('/sessions/{sessionId}/review/branches', {
        params: { path: { sessionId } },
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to load branches');
      return data;
    },
  });

  const markReviewed = useMutation({
    mutationFn: async (path: string) => {
      const { error } = await getClient().api.POST('/sessions/{sessionId}/review/reviewed', {
        params: { path: { sessionId } },
        body: { path },
      });
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['review-files', sessionId] });
    },
  });

  const unmarkReviewed = useMutation({
    mutationFn: async (path: string) => {
      const { error } = await getClient().api.DELETE('/sessions/{sessionId}/review/reviewed', {
        params: { path: { sessionId } },
        body: { path },
      });
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['review-files', sessionId] });
    },
  });

  const push = useMutation({
    mutationFn: async (input: { branch: string; commitMessage?: string }) => {
      const { data, error } = await getClient().api.POST('/sessions/{sessionId}/review/push', {
        params: { path: { sessionId } },
        body: input,
      });
      if (error || !data) throw new Error(error?.error ?? 'Failed to push');
      return data;
    },
    onSuccess: () => {
      setShowPush(false);
      setCommitMessage('');
      void queryClient.invalidateQueries({ queryKey: ['review-files', sessionId] });
    },
  });

  const handlePush = (e: FormEvent): void => {
    e.preventDefault();
    const branch = pushBranch || branches.data?.baseBranch;
    if (!branch) return;
    push.mutate({
      branch,
      ...(commitMessage ? { commitMessage } : {}),
    });
  };

  if (branches.data && !pushBranch) {
    setPushBranch(branches.data.baseBranch);
  }

  const selectedFileData = files.data?.files.find((f) => f.path === selectedFile);
  const hasFiles = (files.data?.files.length ?? 0) > 0;

  const diffElement = selectedFile && diff.isLoading ? (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-xs text-text-muted">loading diff...</p>
    </div>
  ) : diff.data ? (
    <DiffViewer
      filePath={diff.data.filePath}
      baseRef={diff.data.baseRef}
      compareRef={diff.data.compareRef}
      original={diff.data.original ?? null}
      modified={diff.data.modified ?? null}
      isReviewed={selectedFileData?.isReviewed ?? false}
      isStale={selectedFileData?.isStale ?? false}
      onMarkReviewed={() => selectedFile && markReviewed.mutate(selectedFile)}
      onUnmarkReviewed={() => selectedFile && unmarkReviewed.mutate(selectedFile)}
      renderSideBySide={isDesktop}
    />
  ) : (
    <DiffViewer
      filePath={null}
      baseRef=""
      compareRef=""
      original={null}
      modified={null}
      isReviewed={false}
      isStale={false}
      onMarkReviewed={() => {}}
      onUnmarkReviewed={() => {}}
      renderSideBySide={isDesktop}
    />
  );

  const fileListElement = files.isLoading ? (
    <div className="p-3 text-center font-mono text-xs text-text-muted">loading...</div>
  ) : files.data ? (
    <ReviewFileList
      files={files.data.files}
      summary={files.data.summary}
      selectedFile={selectedFile}
      onSelectFile={setSelectedFile}
      onToggleReview={(path, isReviewed) => {
        if (isReviewed) {
          unmarkReviewed.mutate(path);
        } else {
          markReviewed.mutate(path);
        }
      }}
    />
  ) : (
    <div className="p-3 text-center font-mono text-xs text-danger">
      {files.error?.message ?? 'failed to load'}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-base bg-surface-1 px-3 py-2 lg:px-5">
        {branches.data && (
          <>
            <span className="font-mono text-ui text-text-muted">compare:</span>
            <BranchSelector
              branches={branches.data.branches}
              baseBranch={branches.data.baseBranch}
              value={compareRef ?? branches.data.baseBranch}
              onChange={(branch) =>
                setCompareRef(branch === branches.data.baseBranch ? undefined : branch)
              }
            />
          </>
        )}
        {hasFiles && (
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => setShowPush(!showPush)}
          >
            {showPush ? 'cancel' : 'push'}
          </Button>
        )}
      </div>

      {/* Push form */}
      {showPush && (
        <form
          onSubmit={handlePush}
          className="shrink-0 border-b border-border-base bg-surface-0/50 px-3 py-2.5 lg:px-5"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>Branch</Label>
              <Input
                required
                inputSize="sm"
                value={pushBranch}
                onChange={(e) => setPushBranch(e.target.value)}
                placeholder={branches.data?.baseBranch ?? 'main'}
              />
            </div>
            <div className="flex-[2]">
              <Label>Commit message (if uncommitted changes)</Label>
              <Input
                inputSize="sm"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="optional — defaults to session description"
              />
            </div>
            <Button type="submit" size="sm" disabled={push.isPending}>
              {push.isPending ? 'pushing...' : 'commit & push'}
            </Button>
          </div>
          {push.error && (
            <p className="mt-2 font-mono text-xs text-danger">
              {push.error instanceof Error ? push.error.message : 'Failed'}
            </p>
          )}
          {push.data && (
            <p className="mt-2 font-mono text-xs text-text-dim">
              pushed to <span className="text-accent">{push.data.branch}</span>
              {push.data.committed && push.data.commitHash && (
                <> (committed {push.data.commitHash.slice(0, 7)})</>
              )}
            </p>
          )}
        </form>
      )}

      {isDesktop ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 shrink-0 overflow-hidden border-r border-border-base bg-surface-1">
            {fileListElement}
          </div>
          <div className="flex-1 overflow-hidden bg-surface-0">
            {diffElement}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="max-h-48 shrink-0 overflow-y-auto border-b border-border-base bg-surface-1">
            {fileListElement}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-surface-0">
            {diffElement}
          </div>
        </div>
      )}
    </div>
  );
};

const Route = createFileRoute('/_authenticated/sessions/$sessionId/review')({
  component: ReviewPage,
});

export { Route };
