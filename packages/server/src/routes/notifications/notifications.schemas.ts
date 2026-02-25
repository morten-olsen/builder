import { z } from 'zod';

const channelParamsSchema = z.object({
  channelId: z.string(),
});

const createChannelBodySchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
});

const updateChannelBodySchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const channelResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  provider: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const channelListResponseSchema = z.array(channelResponseSchema);

const providerListResponseSchema = z.array(z.string());

const preferencesResponseSchema = z.object({
  notificationsEnabled: z.boolean(),
  notificationEvents: z.array(z.string()),
});

const updatePreferencesBodySchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  notificationEvents: z.array(z.string()).optional(),
});

const sessionNotificationBodySchema = z.object({
  enabled: z.boolean().nullable(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

const successResponseSchema = z.object({
  success: z.boolean(),
});

type ChannelParams = z.infer<typeof channelParamsSchema>;
type CreateChannelBody = z.infer<typeof createChannelBodySchema>;
type UpdateChannelBody = z.infer<typeof updateChannelBodySchema>;
type ChannelResponseData = z.infer<typeof channelResponseSchema>;
type ChannelListResponseData = z.infer<typeof channelListResponseSchema>;
type PreferencesResponseData = z.infer<typeof preferencesResponseSchema>;
type UpdatePreferencesBody = z.infer<typeof updatePreferencesBodySchema>;
type SessionNotificationBody = z.infer<typeof sessionNotificationBodySchema>;

export type {
  ChannelParams,
  CreateChannelBody,
  UpdateChannelBody,
  ChannelResponseData,
  ChannelListResponseData,
  PreferencesResponseData,
  UpdatePreferencesBody,
  SessionNotificationBody,
};
export {
  channelParamsSchema,
  createChannelBodySchema,
  updateChannelBodySchema,
  channelResponseSchema,
  channelListResponseSchema,
  providerListResponseSchema,
  preferencesResponseSchema,
  updatePreferencesBodySchema,
  sessionNotificationBodySchema,
  errorResponseSchema,
  successResponseSchema,
};
