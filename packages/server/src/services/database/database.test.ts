import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';

import { DatabaseService } from './database.js';

describe('DatabaseService', () => {
  let services: Services;
  let dbService: DatabaseService;

  beforeEach(() => {
    services = new Services(createTestConfig());
    dbService = services.get(DatabaseService);
  });

  afterEach(async () => {
    await services[destroy]();
  });

  it('runs migrations and creates the users table', async () => {
    const db = await dbService.getInstance();

    const result = await db
      .selectFrom('users')
      .selectAll()
      .execute();

    expect(result).toEqual([]);
  });

  it('supports CRUD operations on users', async () => {
    const db = await dbService.getInstance();

    await db
      .insertInto('users')
      .values({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'hashed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const users = await db
      .selectFrom('users')
      .selectAll()
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('test@example.com');
  });

  it('enforces unique email constraint', async () => {
    const db = await dbService.getInstance();

    const user = {
      id: 'user-1',
      email: 'dup@example.com',
      password_hash: 'hashed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.insertInto('users').values(user).execute();

    await expect(
      db.insertInto('users').values({ ...user, id: 'user-2' }).execute(),
    ).rejects.toThrow();
  });

  it('returns the same instance on repeated calls', async () => {
    const db1 = await dbService.getInstance();
    const db2 = await dbService.getInstance();
    expect(db1).toBe(db2);
  });
});
