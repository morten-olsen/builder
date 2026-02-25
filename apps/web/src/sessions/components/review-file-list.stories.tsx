import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ReviewFileList } from './review-file-list.js';

const meta: Meta<typeof ReviewFileList> = {
  title: 'Composite/ReviewFileList',
  component: ReviewFileList,
};

type Story = StoryObj<typeof ReviewFileList>;

const mockFiles = [
  { path: 'src/auth/auth.ts', status: 'modified' as const, additions: 12, deletions: 3, oldPath: null, isReviewed: true, isStale: false, reviewedAt: '2025-01-01' },
  { path: 'src/auth/auth.test.ts', status: 'modified' as const, additions: 45, deletions: 0, oldPath: null, isReviewed: false, isStale: false, reviewedAt: null },
  { path: 'src/middleware/rate-limit.ts', status: 'added' as const, additions: 28, deletions: 0, oldPath: null, isReviewed: false, isStale: false, reviewedAt: null },
  { path: 'src/utils/old-helper.ts', status: 'deleted' as const, additions: 0, deletions: 15, oldPath: null, isReviewed: true, isStale: true, reviewedAt: '2025-01-01' },
  { path: 'src/services/user.ts', status: 'renamed' as const, additions: 2, deletions: 2, oldPath: 'src/services/user-service.ts', isReviewed: false, isStale: false, reviewedAt: null },
];

const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);
    return (
      <div className="h-96 w-72 border border-border-base bg-surface-1">
        <ReviewFileList
          files={mockFiles}
          summary={{ total: 5, reviewed: 2, stale: 1 }}
          selectedFile={selected}
          onSelectFile={setSelected}
          onToggleReview={(path, isReviewed) =>
            console.log('toggle:', path, isReviewed)
          }
        />
      </div>
    );
  },
};

const AllReviewed: Story = {
  render: () => (
    <div className="h-96 w-72 border border-border-base bg-surface-1">
      <ReviewFileList
        files={mockFiles.map((f) => ({ ...f, isReviewed: true, isStale: false }))}
        summary={{ total: 5, reviewed: 5, stale: 0 }}
        selectedFile={null}
        onSelectFile={() => {}}
        onToggleReview={() => {}}
      />
    </div>
  ),
};

const Empty: Story = {
  render: () => (
    <div className="h-48 w-72 border border-border-base bg-surface-1">
      <ReviewFileList
        files={[]}
        summary={{ total: 0, reviewed: 0, stale: 0 }}
        selectedFile={null}
        onSelectFile={() => {}}
        onToggleReview={() => {}}
      />
    </div>
  ),
};

export default meta;
export { Default, AllReviewed, Empty };
