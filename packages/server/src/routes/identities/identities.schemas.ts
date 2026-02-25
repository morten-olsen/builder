import { z } from 'zod';

const userParamsSchema = z.object({
  userId: z.string(),
});

const identityParamsSchema = z.object({
  userId: z.string(),
  identityId: z.string(),
});

const createIdentityBodySchema = z
  .object({
    name: z.string().min(1),
    gitAuthorName: z.string().min(1),
    gitAuthorEmail: z.string().email(),
    publicKey: z.string().optional(),
    privateKey: z.string().optional(),
  })
  .refine(
    (data) => !data.publicKey || data.privateKey,
    { message: 'publicKey cannot be provided without privateKey' },
  );

const updateIdentityBodySchema = z.object({
  name: z.string().min(1).optional(),
  gitAuthorName: z.string().min(1).optional(),
  gitAuthorEmail: z.string().email().optional(),
});

const identityResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  gitAuthorName: z.string(),
  gitAuthorEmail: z.string(),
  publicKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const identityListResponseSchema = z.array(identityResponseSchema);

const errorResponseSchema = z.object({
  error: z.string(),
});

type UserParams = z.infer<typeof userParamsSchema>;
type IdentityParams = z.infer<typeof identityParamsSchema>;
type CreateIdentityBody = z.infer<typeof createIdentityBodySchema>;
type UpdateIdentityBody = z.infer<typeof updateIdentityBodySchema>;
type IdentityResponseData = z.infer<typeof identityResponseSchema>;
type IdentityListResponseData = z.infer<typeof identityListResponseSchema>;

export type {
  UserParams,
  IdentityParams,
  CreateIdentityBody,
  UpdateIdentityBody,
  IdentityResponseData,
  IdentityListResponseData,
};
export {
  userParamsSchema,
  identityParamsSchema,
  createIdentityBodySchema,
  updateIdentityBodySchema,
  identityResponseSchema,
  identityListResponseSchema,
  errorResponseSchema,
};
