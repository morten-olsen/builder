import { z } from 'zod';

const sessionParamsSchema = z.object({
  sessionId: z.string(),
});

const createSessionBodySchema = z.object({
  repoId: z.string().min(1),
  identityId: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  sessionBranch: z.string().min(1).optional(),
  prompt: z.string().min(1),
});

const sendMessageBodySchema = z.object({
  message: z.string().min(1),
});

const sessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  identityId: z.string(),
  repoUrl: z.string(),
  branch: z.string(),
  sessionBranch: z.string().nullable(),
  prompt: z.string(),
  status: z.string(),
  error: z.string().nullable(),
  repoId: z.string().nullable(),
  pinnedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const sessionListResponseSchema = z.array(sessionResponseSchema);

const revertSessionBodySchema = z.object({
  messageId: z.string().min(1),
});

const pinSessionBodySchema = z.object({
  pinned: z.boolean(),
});

const messageResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.string(),
  content: z.string(),
  commitSha: z.string().nullable(),
  createdAt: z.string(),
});

const messageListResponseSchema = z.array(messageResponseSchema);

const errorResponseSchema = z.object({
  error: z.string(),
});

type SessionParams = z.infer<typeof sessionParamsSchema>;
type CreateSessionBody = z.infer<typeof createSessionBodySchema>;
type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
type SessionResponseData = z.infer<typeof sessionResponseSchema>;
type SessionListResponseData = z.infer<typeof sessionListResponseSchema>;
type RevertSessionBody = z.infer<typeof revertSessionBodySchema>;
type PinSessionBody = z.infer<typeof pinSessionBodySchema>;
type MessageResponseData = z.infer<typeof messageResponseSchema>;
type MessageListResponseData = z.infer<typeof messageListResponseSchema>;

export type {
  SessionParams,
  CreateSessionBody,
  SendMessageBody,
  SessionResponseData,
  SessionListResponseData,
  RevertSessionBody,
  PinSessionBody,
  MessageResponseData,
  MessageListResponseData,
};
export {
  sessionParamsSchema,
  createSessionBodySchema,
  sendMessageBodySchema,
  revertSessionBodySchema,
  pinSessionBodySchema,
  messageResponseSchema,
  messageListResponseSchema,
  sessionResponseSchema,
  sessionListResponseSchema,
  errorResponseSchema,
};
