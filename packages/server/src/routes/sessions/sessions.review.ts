import path from 'node:path';

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { FileReviewService } from '../../services/file-review/file-review.js';
import { GitService, repoHash } from '../../services/git/git.js';
import { IdentityService } from '../../services/identity/identity.js';
import { SessionService } from '../../services/session/session.js';

import { sessionParamsSchema, errorResponseSchema } from './sessions.schemas.js';
import {
  reviewFilesQuerySchema,
  reviewFilesResponseSchema,
  reviewDiffQuerySchema,
  reviewDiffResponseSchema,
  reviewBranchesResponseSchema,
  reviewMarkBodySchema,
  reviewPushBodySchema,
  reviewPushResponseSchema,
} from './sessions.review.schemas.js';

const requireUser = (user: AuthTokenPayload | null, reply: FastifyReply): AuthTokenPayload => {
  if (!user) {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
  return user;
};

const registerReviewRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get('/sessions/:sessionId/review/files', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      querystring: reviewFilesQuerySchema,
      response: {
        200: reviewFilesResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      const gitService = app.services.get(GitService);
      const fileReviewService = app.services.get(FileReviewService);

      const worktreePath = path.join(app.config.session.dataDir, 'worktrees', session.id);
      const baseRef = session.branch;
      const compareRef = request.query.compareRef;

      const changedFiles = await gitService.getChangedFiles({
        worktreePath,
        baseRef,
        compareRef,
      });

      const reviews = await fileReviewService.listBySession({
        sessionId: session.id,
        userId: user.sub,
      });

      const reviewMap = new Map(reviews.map((r) => [r.filePath, r]));

      let reviewedCount = 0;
      let staleCount = 0;

      const files = await Promise.all(
        changedFiles.map(async (file) => {
          const review = reviewMap.get(file.path);
          let isReviewed = false;
          let isStale = false;
          let reviewedAt: string | null = null;

          if (review) {
            isReviewed = true;
            reviewedAt = review.createdAt;
            const currentHash = await gitService.getFileHash({
              worktreePath,
              filePath: file.path,
            });
            if (currentHash && currentHash !== review.fileHash) {
              isStale = true;
              staleCount++;
            }
            reviewedCount++;
          }

          return {
            path: file.path,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            oldPath: file.oldPath,
            isReviewed,
            isStale,
            reviewedAt,
          };
        }),
      );

      reply.send({
        files,
        baseRef,
        compareRef: compareRef ?? 'HEAD',
        summary: {
          total: files.length,
          reviewed: reviewedCount,
          stale: staleCount,
        },
      });
    },
  });

  typedApp.get('/sessions/:sessionId/review/diff', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      querystring: reviewDiffQuerySchema,
      response: {
        200: reviewDiffResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      const gitService = app.services.get(GitService);
      const worktreePath = path.join(app.config.session.dataDir, 'worktrees', session.id);
      const baseRef = session.branch;
      const filePath = request.query.path ?? null;

      const diff = await gitService.getDiff({
        worktreePath,
        baseRef,
        compareRef: request.query.compareRef,
        filePath: filePath ?? undefined,
      });

      let original: string | null = null;
      let modified: string | null = null;

      if (filePath) {
        [original, modified] = await Promise.all([
          gitService.getFileContent({
            worktreePath,
            filePath,
            ref: baseRef,
          }),
          gitService.getFileContent({
            worktreePath,
            filePath,
          }),
        ]);
      }

      reply.send({
        diff,
        baseRef,
        compareRef: request.query.compareRef ?? 'HEAD',
        filePath,
        original,
        modified,
      });
    },
  });

  typedApp.get('/sessions/:sessionId/review/branches', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      response: {
        200: reviewBranchesResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      const gitService = app.services.get(GitService);
      const bareRepoPath = path.join(
        app.config.session.dataDir,
        'repos',
        repoHash(session.repoUrl, session.identityId),
      );

      const branches = await gitService.listBranches({ bareRepoPath });

      reply.send({
        branches,
        baseBranch: session.branch,
      });
    },
  });

  typedApp.post('/sessions/:sessionId/review/reviewed', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: reviewMarkBodySchema,
      response: {
        200: reviewFilesResponseSchema.shape.files.element,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      const gitService = app.services.get(GitService);
      const fileReviewService = app.services.get(FileReviewService);
      const worktreePath = path.join(app.config.session.dataDir, 'worktrees', session.id);

      const fileHash = await gitService.getFileHash({
        worktreePath,
        filePath: request.body.path,
      });

      const review = await fileReviewService.markReviewed({
        sessionId: session.id,
        userId: user.sub,
        filePath: request.body.path,
        fileHash: fileHash ?? '',
      });

      reply.send({
        path: review.filePath,
        status: 'modified' as const,
        additions: 0,
        deletions: 0,
        oldPath: null,
        isReviewed: true,
        isStale: false,
        reviewedAt: review.createdAt,
      });
    },
  });

  typedApp.delete('/sessions/:sessionId/review/reviewed', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: reviewMarkBodySchema,
      response: {
        204: errorResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      await app.services.get(FileReviewService).unmarkReviewed({
        sessionId: session.id,
        userId: user.sub,
        filePath: request.body.path,
      });

      reply.code(204).send({ error: '' });
    },
  });

  typedApp.post('/sessions/:sessionId/review/push', {
    onRequest: [app.authenticate],
    schema: {
      params: sessionParamsSchema,
      body: reviewPushBodySchema,
      response: {
        200: reviewPushResponseSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const user = requireUser(request.user, reply);
      const session = await app.services.get(SessionService).get({
        userId: user.sub,
        sessionId: request.params.sessionId,
      });

      const gitService = app.services.get(GitService);
      const identityService = app.services.get(IdentityService);

      const worktreePath = path.join(app.config.session.dataDir, 'worktrees', session.id);
      const targetBranch = request.body.branch;

      let committed = false;
      let commitHash: string | null = null;

      const hasChanges = await gitService.hasUncommittedChanges({ worktreePath });
      if (hasChanges) {
        const identity = await identityService.get({
          userId: user.sub,
          identityId: session.identityId,
        });

        const message = request.body.commitMessage ?? `Session ${session.id} changes`;
        commitHash = await gitService.commit({
          worktreePath,
          message,
          authorName: identity.gitAuthorName,
          authorEmail: identity.gitAuthorEmail,
        });
        committed = true;
      }

      const sshPrivateKey = await identityService.getPrivateKey({
        userId: user.sub,
        identityId: session.identityId,
      });

      await gitService.push({
        worktreePath,
        branch: targetBranch,
        sshPrivateKey,
      });

      reply.send({ branch: targetBranch, committed, commitHash });
    },
  });
};

export { registerReviewRoutes };
