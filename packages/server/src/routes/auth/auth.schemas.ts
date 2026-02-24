import { z } from 'zod';

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const authResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    createdAt: z.string(),
  }),
});

const meResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

type RegisterBody = z.infer<typeof registerBodySchema>;
type LoginBody = z.infer<typeof loginBodySchema>;
type AuthResponseData = z.infer<typeof authResponseSchema>;
type MeResponseData = z.infer<typeof meResponseSchema>;
type ErrorResponseData = z.infer<typeof errorResponseSchema>;

export type { RegisterBody, LoginBody, AuthResponseData, MeResponseData, ErrorResponseData };
export {
  registerBodySchema,
  loginBodySchema,
  authResponseSchema,
  meResponseSchema,
  errorResponseSchema,
};
