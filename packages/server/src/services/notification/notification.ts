import { randomUUID } from 'node:crypto';
import type { z } from 'zod';

import type { Services } from '../../container/container.js';
import { DatabaseService } from '../database/database.js';
import { encrypt, decrypt } from '../../utils/crypto.js';

import { NotificationChannelNotFoundError, NotificationProviderNotFoundError } from './notification.errors.js';

type NotificationLevel = 'info' | 'warning' | 'error';

type Notification = {
  title: string;
  body: string;
  level: NotificationLevel;
  sessionId?: string;
  tags?: string[];
};

type NotificationProvider = {
  name: string;
  configSchema: z.ZodType;
  send: (config: Record<string, unknown>, notification: Notification) => Promise<void>;
};

type NotificationChannel = {
  id: string;
  userId: string;
  name: string;
  provider: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreateChannelInput = {
  userId: string;
  name: string;
  provider: string;
  config: Record<string, unknown>;
};

type UpdateChannelInput = {
  userId: string;
  channelId: string;
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
};

class NotificationService {
  #services: Services;
  #providers = new Map<string, NotificationProvider>();

  constructor(services: Services) {
    this.#services = services;
  }

  get #database(): DatabaseService {
    return this.#services.get(DatabaseService);
  }

  get #encryptionKey(): string {
    return this.#services.config.encryption.key;
  }

  registerProvider = (provider: NotificationProvider): void => {
    this.#providers.set(provider.name, provider);
  };

  getProvider = (name: string): NotificationProvider => {
    const provider = this.#providers.get(name);
    if (!provider) {
      throw new NotificationProviderNotFoundError(name);
    }
    return provider;
  };

  getProviderNames = (): string[] => {
    return [...this.#providers.keys()];
  };

  create = async (input: CreateChannelInput): Promise<NotificationChannel> => {
    const provider = this.getProvider(input.provider);
    provider.configSchema.parse(input.config);

    const db = await this.#database.getInstance();
    const id = randomUUID();
    const now = new Date().toISOString();
    const encryptedConfig = encrypt(JSON.stringify(input.config), this.#encryptionKey);

    await db
      .insertInto('notification_channels')
      .values({
        id,
        user_id: input.userId,
        name: input.name,
        provider: input.provider,
        encrypted_config: encryptedConfig,
        enabled: 1,
        created_at: now,
        updated_at: now,
      })
      .execute();

    return {
      id,
      userId: input.userId,
      name: input.name,
      provider: input.provider,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
  };

  list = async (userId: string): Promise<NotificationChannel[]> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('notification_channels')
      .select(['id', 'user_id', 'name', 'provider', 'enabled', 'created_at', 'updated_at'])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      provider: row.provider,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  };

  get = async (input: { userId: string; channelId: string }): Promise<NotificationChannel> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('notification_channels')
      .select(['id', 'user_id', 'name', 'provider', 'enabled', 'created_at', 'updated_at'])
      .where('id', '=', input.channelId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (!row) {
      throw new NotificationChannelNotFoundError();
    }

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      provider: row.provider,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  update = async (input: UpdateChannelInput): Promise<NotificationChannel> => {
    const existing = await this.get({ userId: input.userId, channelId: input.channelId });
    const db = await this.#database.getInstance();
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { updated_at: now };

    if (input.name !== undefined) updates.name = input.name;
    if (input.enabled !== undefined) updates.enabled = input.enabled ? 1 : 0;

    if (input.config !== undefined) {
      const provider = this.getProvider(existing.provider);
      provider.configSchema.parse(input.config);
      updates.encrypted_config = encrypt(JSON.stringify(input.config), this.#encryptionKey);
    }

    await db
      .updateTable('notification_channels')
      .set(updates)
      .where('id', '=', input.channelId)
      .where('user_id', '=', input.userId)
      .execute();

    return {
      ...existing,
      name: input.name ?? existing.name,
      enabled: input.enabled ?? existing.enabled,
      updatedAt: now,
    };
  };

  delete = async (input: { userId: string; channelId: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const result = await db
      .deleteFrom('notification_channels')
      .where('id', '=', input.channelId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      throw new NotificationChannelNotFoundError();
    }
  };

  dispatch = async (userId: string, notification: Notification): Promise<void> => {
    const db = await this.#database.getInstance();

    const rows = await db
      .selectFrom('notification_channels')
      .select(['id', 'provider', 'encrypted_config'])
      .where('user_id', '=', userId)
      .where('enabled', '=', 1)
      .execute();

    const results = await Promise.allSettled(
      rows.map(async (row) => {
        const provider = this.#providers.get(row.provider);
        if (!provider) return;

        const config = JSON.parse(decrypt(row.encrypted_config, this.#encryptionKey)) as Record<string, unknown>;
        await provider.send(config, notification);
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Notification dispatch failed:', result.reason);
      }
    }
  };

  test = async (input: { userId: string; channelId: string }): Promise<void> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('notification_channels')
      .select(['id', 'provider', 'encrypted_config'])
      .where('id', '=', input.channelId)
      .where('user_id', '=', input.userId)
      .executeTakeFirst();

    if (!row) {
      throw new NotificationChannelNotFoundError();
    }

    const provider = this.getProvider(row.provider);
    const config = JSON.parse(decrypt(row.encrypted_config, this.#encryptionKey)) as Record<string, unknown>;

    await provider.send(config, {
      title: 'Test notification',
      body: 'This is a test notification from Builder.',
      level: 'info',
      tags: ['test'],
    });
  };

  getPreferences = async (userId: string): Promise<{ notificationsEnabled: boolean; notificationEvents: string[] }> => {
    const db = await this.#database.getInstance();

    const row = await db
      .selectFrom('users')
      .select(['notifications_enabled', 'notification_events'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!row) {
      return { notificationsEnabled: true, notificationEvents: ['session:completed', 'session:error', 'session:waiting_for_input'] };
    }

    return {
      notificationsEnabled: row.notifications_enabled === 1,
      notificationEvents: JSON.parse(row.notification_events) as string[],
    };
  };

  updatePreferences = async (input: { userId: string; notificationsEnabled?: boolean; notificationEvents?: string[] }): Promise<{ notificationsEnabled: boolean; notificationEvents: string[] }> => {
    const db = await this.#database.getInstance();
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { updated_at: now };

    if (input.notificationsEnabled !== undefined) {
      updates.notifications_enabled = input.notificationsEnabled ? 1 : 0;
    }
    if (input.notificationEvents !== undefined) {
      updates.notification_events = JSON.stringify(input.notificationEvents);
    }

    await db
      .updateTable('users')
      .set(updates)
      .where('id', '=', input.userId)
      .execute();

    return this.getPreferences(input.userId);
  };
}

export type {
  NotificationLevel,
  Notification,
  NotificationProvider,
  NotificationChannel,
  CreateChannelInput,
  UpdateChannelInput,
};
export { NotificationService };
