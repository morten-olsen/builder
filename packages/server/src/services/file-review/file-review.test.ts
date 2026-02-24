import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestConfig } from '../../config/config.testing.js';
import { Services, destroy } from '../../container/container.js';
import { AuthService } from '../auth/auth.js';
import { DatabaseService } from '../database/database.js';

import { FileReviewService } from './file-review.js';

describe('FileReviewService', () => {
  let services: Services;
  let fileReviewService: FileReviewService;
  let userId: string;
  let sessionId: string;

  beforeEach(async () => {
    services = new Services(createTestConfig());
    fileReviewService = services.get(FileReviewService);

    const auth = services.get(AuthService);
    const { user } = await auth.register({ email: 'test@example.com', password: 'password123' });
    userId = user.id;

    // Create a session directly in the DB for FK constraints
    const db = await services.get(DatabaseService).getInstance();
    await db
      .insertInto('identities')
      .values({
        id: 'identity-1',
        user_id: userId,
        name: 'Test',
        git_author_name: 'Alice',
        git_author_email: 'alice@test.com',
        public_key: 'pub',
        encrypted_private_key: 'enc',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    sessionId = 'session-1';
    await db
      .insertInto('sessions')
      .values({
        id: sessionId,
        user_id: userId,
        identity_id: 'identity-1',
        repo_url: 'git@github.com:test/repo.git',
        branch: 'main',
        prompt: 'Fix bug',
        status: 'idle',
        error: null,
        repo_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();
  });

  afterEach(async () => {
    await services[destroy]();
  });

  describe('markReviewed', () => {
    it('creates a review record', async () => {
      const review = await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/index.ts',
        fileHash: 'abc123',
      });

      expect(review.sessionId).toBe(sessionId);
      expect(review.userId).toBe(userId);
      expect(review.filePath).toBe('src/index.ts');
      expect(review.fileHash).toBe('abc123');
      expect(review.id).toBeTruthy();
      expect(review.createdAt).toBeTruthy();
    });

    it('upserts when re-reviewing the same file', async () => {
      await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/index.ts',
        fileHash: 'abc123',
      });

      const updated = await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/index.ts',
        fileHash: 'def456',
      });

      expect(updated.fileHash).toBe('def456');

      const reviews = await fileReviewService.listBySession({ sessionId, userId });
      expect(reviews).toHaveLength(1);
      expect(reviews[0].fileHash).toBe('def456');
    });
  });

  describe('unmarkReviewed', () => {
    it('removes a review record', async () => {
      await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/index.ts',
        fileHash: 'abc123',
      });

      await fileReviewService.unmarkReviewed({
        sessionId,
        userId,
        filePath: 'src/index.ts',
      });

      const reviews = await fileReviewService.listBySession({ sessionId, userId });
      expect(reviews).toHaveLength(0);
    });

    it('does not throw when unmarking a non-reviewed file', async () => {
      await expect(
        fileReviewService.unmarkReviewed({
          sessionId,
          userId,
          filePath: 'nonexistent.ts',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('listBySession', () => {
    it('returns all reviews for a session and user', async () => {
      await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/a.ts',
        fileHash: 'hash-a',
      });
      await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/b.ts',
        fileHash: 'hash-b',
      });

      const reviews = await fileReviewService.listBySession({ sessionId, userId });
      expect(reviews).toHaveLength(2);
      const paths = reviews.map((r) => r.filePath);
      expect(paths).toContain('src/a.ts');
      expect(paths).toContain('src/b.ts');
    });

    it('returns empty array when no reviews exist', async () => {
      const reviews = await fileReviewService.listBySession({ sessionId, userId });
      expect(reviews).toEqual([]);
    });

    it('does not return reviews from other users', async () => {
      await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/a.ts',
        fileHash: 'hash-a',
      });

      const auth = services.get(AuthService);
      const { user: otherUser } = await auth.register({
        email: 'other@example.com',
        password: 'password123',
      });

      const reviews = await fileReviewService.listBySession({
        sessionId,
        userId: otherUser.id,
      });
      expect(reviews).toEqual([]);
    });
  });

  describe('cascade delete', () => {
    it('deletes reviews when session is deleted', async () => {
      await fileReviewService.markReviewed({
        sessionId,
        userId,
        filePath: 'src/a.ts',
        fileHash: 'hash-a',
      });

      const db = await services.get(DatabaseService).getInstance();
      await db.deleteFrom('sessions').where('id', '=', sessionId).execute();

      const reviews = await fileReviewService.listBySession({ sessionId, userId });
      expect(reviews).toEqual([]);
    });
  });
});
