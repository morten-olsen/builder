import { z } from 'zod';

const reviewFileSchema = z.object({
  path: z.string(),
  status: z.enum(['added', 'modified', 'deleted', 'renamed']),
  additions: z.number(),
  deletions: z.number(),
  oldPath: z.string().nullable(),
  isReviewed: z.boolean(),
  isStale: z.boolean(),
  reviewedAt: z.string().nullable(),
});

const reviewFilesQuerySchema = z.object({
  compareRef: z.string().optional(),
});

const reviewFilesSummarySchema = z.object({
  total: z.number(),
  reviewed: z.number(),
  stale: z.number(),
});

const reviewFilesResponseSchema = z.object({
  files: z.array(reviewFileSchema),
  baseRef: z.string(),
  compareRef: z.string(),
  summary: reviewFilesSummarySchema,
});

const reviewDiffQuerySchema = z.object({
  path: z.string().optional(),
  compareRef: z.string().optional(),
});

const reviewDiffResponseSchema = z.object({
  diff: z.string(),
  baseRef: z.string(),
  compareRef: z.string(),
  filePath: z.string().nullable(),
  original: z.string().nullable(),
  modified: z.string().nullable(),
});

const reviewBranchesResponseSchema = z.object({
  branches: z.array(z.string()),
  baseBranch: z.string(),
});

const reviewMarkBodySchema = z.object({
  path: z.string().min(1),
});

const reviewPushBodySchema = z.object({
  branch: z.string().min(1),
  commitMessage: z.string().min(1).optional(),
});

const reviewPushResponseSchema = z.object({
  branch: z.string(),
  committed: z.boolean(),
  commitHash: z.string().nullable(),
});

type ReviewFile = z.infer<typeof reviewFileSchema>;
type ReviewFilesQuery = z.infer<typeof reviewFilesQuerySchema>;
type ReviewFilesResponse = z.infer<typeof reviewFilesResponseSchema>;
type ReviewDiffQuery = z.infer<typeof reviewDiffQuerySchema>;
type ReviewDiffResponse = z.infer<typeof reviewDiffResponseSchema>;
type ReviewBranchesResponse = z.infer<typeof reviewBranchesResponseSchema>;
type ReviewMarkBody = z.infer<typeof reviewMarkBodySchema>;
type ReviewPushBody = z.infer<typeof reviewPushBodySchema>;
type ReviewPushResponse = z.infer<typeof reviewPushResponseSchema>;

export type {
  ReviewFile,
  ReviewFilesQuery,
  ReviewFilesResponse,
  ReviewDiffQuery,
  ReviewDiffResponse,
  ReviewBranchesResponse,
  ReviewMarkBody,
  ReviewPushBody,
  ReviewPushResponse,
};
export {
  reviewFileSchema,
  reviewFilesQuerySchema,
  reviewFilesResponseSchema,
  reviewDiffQuerySchema,
  reviewDiffResponseSchema,
  reviewBranchesResponseSchema,
  reviewMarkBodySchema,
  reviewPushBodySchema,
  reviewPushResponseSchema,
};
