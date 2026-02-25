import { z } from 'zod';

import type { NotificationProvider } from './notification.js';

const ntfyConfigSchema = z.object({
  server: z.string().url().default('https://ntfy.sh'),
  topic: z.string().min(1),
  token: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

const levelToPriority: Record<string, string> = {
  info: '3',
  warning: '3',
  error: '3',
};

const createNtfyProvider = (): NotificationProvider => ({
  name: 'ntfy',
  configSchema: ntfyConfigSchema,
  send: async (config, notification) => {
    const parsed = ntfyConfigSchema.parse(config);
    const url = `${parsed.server.replace(/\/$/, '')}/${parsed.topic}`;

    const headers: Record<string, string> = {
      Title: notification.title,
      Priority: levelToPriority[notification.level] ?? '3',
    };

    if (notification.tags?.length) {
      headers.Tags = notification.tags.join(',');
    }

    if (parsed.token) {
      headers.Authorization = `Bearer ${parsed.token}`;
    } else if (parsed.username && parsed.password) {
      headers.Authorization = `Basic ${btoa(`${parsed.username}:${parsed.password}`)}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: notification.body,
    });

    if (!response.ok) {
      throw new Error(`ntfy request failed: ${response.status} ${response.statusText}`);
    }
  },
});

export { createNtfyProvider, ntfyConfigSchema };
