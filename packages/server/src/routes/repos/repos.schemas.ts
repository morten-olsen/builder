import { z } from 'zod';

const repoParamsSchema = z.object({
  repoId: z.string(),
});

const createRepoBodySchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/, 'Must be a lowercase slug'),
  name: z.string().min(1),
  repoUrl: z.string().min(1),
  defaultBranch: z.string().min(1).optional(),
  defaultIdentityId: z.string().min(1).optional(),
});

const updateRepoBodySchema = z.object({
  name: z.string().min(1).optional(),
  repoUrl: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).nullable().optional(),
  defaultIdentityId: z.string().min(1).nullable().optional(),
});

const repoResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  repoUrl: z.string(),
  defaultBranch: z.string().nullable(),
  defaultIdentityId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const repoListResponseSchema = z.array(repoResponseSchema);

const errorResponseSchema = z.object({
  error: z.string(),
});

type RepoParams = z.infer<typeof repoParamsSchema>;
type CreateRepoBody = z.infer<typeof createRepoBodySchema>;
type UpdateRepoBody = z.infer<typeof updateRepoBodySchema>;
type RepoResponseData = z.infer<typeof repoResponseSchema>;
type RepoListResponseData = z.infer<typeof repoListResponseSchema>;

export type {
  RepoParams,
  CreateRepoBody,
  UpdateRepoBody,
  RepoResponseData,
  RepoListResponseData,
};
export {
  repoParamsSchema,
  createRepoBodySchema,
  updateRepoBodySchema,
  repoResponseSchema,
  repoListResponseSchema,
  errorResponseSchema,
};
