import { z } from 'zod';

const registerBodySchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/, 'Must be a lowercase slug'),
  password: z.string().min(8),
});

const loginBodySchema = z.object({
  id: z.string().min(1),
  password: z.string(),
});

const authResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    createdAt: z.string(),
  }),
});

const meResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
});

const changePasswordBodySchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

const successResponseSchema = z.object({
  success: z.literal(true),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

type RegisterBody = z.infer<typeof registerBodySchema>;
type LoginBody = z.infer<typeof loginBodySchema>;
type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
type AuthResponseData = z.infer<typeof authResponseSchema>;
type MeResponseData = z.infer<typeof meResponseSchema>;
type SuccessResponseData = z.infer<typeof successResponseSchema>;
type ErrorResponseData = z.infer<typeof errorResponseSchema>;

export type { RegisterBody, LoginBody, ChangePasswordBody, AuthResponseData, MeResponseData, SuccessResponseData, ErrorResponseData };
export {
  registerBodySchema,
  loginBodySchema,
  changePasswordBodySchema,
  authResponseSchema,
  meResponseSchema,
  successResponseSchema,
  errorResponseSchema,
};
