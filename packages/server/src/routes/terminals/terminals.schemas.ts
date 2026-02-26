import { z } from 'zod';

const terminalParamsSchema = z.object({
  sessionId: z.string(),
  terminalId: z.string(),
});

const sessionParamsOnlySchema = z.object({
  sessionId: z.string(),
});

const createTerminalBodySchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(1).optional(),
  rows: z.number().int().min(1).optional(),
});

const resizeTerminalBodySchema = z.object({
  cols: z.number().int().min(1),
  rows: z.number().int().min(1),
});

const terminalInfoResponseSchema = z.object({
  id: z.string(),
  cols: z.number(),
  rows: z.number(),
  shell: z.string(),
  cwd: z.string(),
  createdAt: z.string(),
});

const terminalListResponseSchema = z.array(terminalInfoResponseSchema);

const errorResponseSchema = z.object({
  error: z.string(),
});

type TerminalParams = z.infer<typeof terminalParamsSchema>;
type CreateTerminalBody = z.infer<typeof createTerminalBodySchema>;
type ResizeTerminalBody = z.infer<typeof resizeTerminalBodySchema>;
type TerminalInfoResponse = z.infer<typeof terminalInfoResponseSchema>;
type TerminalListResponse = z.infer<typeof terminalListResponseSchema>;

export type {
  TerminalParams,
  CreateTerminalBody,
  ResizeTerminalBody,
  TerminalInfoResponse,
  TerminalListResponse,
};
export {
  terminalParamsSchema,
  sessionParamsOnlySchema,
  createTerminalBodySchema,
  resizeTerminalBodySchema,
  terminalInfoResponseSchema,
  terminalListResponseSchema,
  errorResponseSchema,
};
