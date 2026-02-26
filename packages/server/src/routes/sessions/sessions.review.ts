import os from 'node:os';
import path from 'node:path';

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type { AuthTokenPayload } from '../../services/auth/auth.js';
import { AuthService } from '../../services/auth/auth.js';
import { FileReviewService } from '../../services/file-review/file-review.js';
import { GitService, repoHash } from '../../services/git/git.js';
import { IdentityService } from '../../services/identity/identity.js';
import type { SessionRef } from '../../services/session/session.js';
import { sessionRef, SessionService } from '../../services/session/session.js';
import type { Services } from '../../container/container.js';

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

const resolveWorktreePath = async (services: Services, ref: SessionRef, identityId: string): Promise<string> => {
  const authService = services.get(AuthService);
  const worktreeBase = await authService.getWorktreeBase(ref.userId);

  if (worktreeBase) {
    return path.join(worktreeBase, identityId, ref.repoId, ref.sessionId);
  }

  return path.join(
    os.homedir(),
    '.builder',
    'users',
    ref.userId,
    'sessions',
    identityId,
    ref.repoId,
    ref.sessionId,
  );
};

const registerReviewRoutes = (app: FastifyInstance): void => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get('/api/sessions/:sessionId/review/files', {
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
      const ref = sessionRef(session);

      const gitService = app.services.get(GitService);
      const fileReviewService = app.services.get(FileReviewService);

      const wtPath = await resolveWorktreePath(app.services, ref, session.identityId);
      const baseRef = session.branch;
      const compareRef = request.query.compareRef;

      const changedFiles = await gitService.getChangedFiles({
        worktreePath: wtPath,
        baseRef,
        compareRef,
      });

      const reviews = await fileReviewService.listBySession({ ref });

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
              worktreePath: wtPath,
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

  typedApp.get('/api/sessions/:sessionId/review/diff', {
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
      const ref = sessionRef(session);

      const gitService = app.services.get(GitService);
      const wtPath = await resolveWorktreePath(app.services, ref, session.identityId);
      const baseRef = session.branch;
      const filePath = request.query.path ?? null;

      const diff = await gitService.getDiff({
        worktreePath: wtPath,
        baseRef,
        compareRef: request.query.compareRef,
        filePath: filePath ?? undefined,
      });

      let original: string | null = null;
      let modified: string | null = null;

      if (filePath) {
        [original, modified] = await Promise.all([
          gitService.getFileContent({
            worktreePath: wtPath,
            filePath,
            ref: baseRef,
          }),
          gitService.getFileContent({
            worktreePath: wtPath,
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

  typedApp.get('/api/sessions/:sessionId/review/branches', {
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

  typedApp.post('/api/sessions/:sessionId/review/reviewed', {
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
      const ref = sessionRef(session);

      const gitService = app.services.get(GitService);
      const fileReviewService = app.services.get(FileReviewService);
      const wtPath = await resolveWorktreePath(app.services, ref, session.identityId);

      const fileHash = await gitService.getFileHash({
        worktreePath: wtPath,
        filePath: request.body.path,
      });

      const review = await fileReviewService.markReviewed({
        ref,
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

  typedApp.delete('/api/sessions/:sessionId/review/reviewed', {
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
      const ref = sessionRef(session);

      await app.services.get(FileReviewService).unmarkReviewed({
        ref,
        filePath: request.body.path,
      });

      reply.code(204).send({ error: '' });
    },
  });

  typedApp.post('/api/sessions/:sessionId/review/push', {
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
      const ref = sessionRef(session);

      const gitService = app.services.get(GitService);
      const identityService = app.services.get(IdentityService);

      const wtPath = await resolveWorktreePath(app.services, ref, session.identityId);
      const targetBranch = request.body.branch;

      let committed = false;
      let commitHash: string | null = null;

      const hasChanges = await gitService.hasUncommittedChanges({ worktreePath: wtPath });
      if (hasChanges) {
        const identity = await identityService.get({
          userId: user.sub,
          identityId: session.identityId,
        });

        const message = request.body.commitMessage ?? `Session ${session.id} changes`;
        commitHash = await gitService.commit({
          worktreePath: wtPath,
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
        worktreePath: wtPath,
        branch: targetBranch,
        sshPrivateKey,
      });

      reply.send({ branch: targetBranch, committed, commitHash });
    },
  });
};

export { registerReviewRoutes };
