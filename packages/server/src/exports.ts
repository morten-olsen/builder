export type { Config } from './config/config.js';
export { configSchema, createConfig } from './config/config.js';

export type { ServiceConstructor } from './container/container.js';
export { Services, destroy } from './container/container.js';

export type { DatabaseSchema, UsersTable, IdentitiesTable, SessionsTable, MessagesTable, SessionEventsTable, FileReviewsTable } from './services/database/database.js';
export { DatabaseService } from './services/database/database.js';

export type { AuthTokenPayload, AuthUser, AuthResponse } from './services/auth/auth.js';
export { AuthService } from './services/auth/auth.js';
export {
  AuthError,
  InvalidCredentialsError,
  EmailAlreadyExistsError,
  InvalidTokenError,
} from './services/auth/auth.errors.js';

export type { Identity, CreateIdentityInput, UpdateIdentityInput } from './services/identity/identity.js';
export { IdentityService } from './services/identity/identity.js';
export {
  IdentityError,
  IdentityNotFoundError,
  IdentityForbiddenError,
} from './services/identity/identity.errors.js';

export type { CreateAppInput } from './app/app.js';
export { createApp } from './app/app.js';
export { registerAllRoutes } from './app/app.routes.js';

export { registerAuthRoutes } from './routes/auth/auth.js';
export { registerIdentityRoutes } from './routes/identities/identities.js';

export type {
  RegisterBody,
  LoginBody,
  AuthResponseData,
  MeResponseData,
  ErrorResponseData,
} from './routes/auth/auth.schemas.js';
export {
  registerBodySchema,
  loginBodySchema,
  authResponseSchema,
  meResponseSchema,
  errorResponseSchema,
} from './routes/auth/auth.schemas.js';

export type {
  UserParams,
  IdentityParams,
  CreateIdentityBody,
  UpdateIdentityBody,
  IdentityResponseData,
  IdentityListResponseData,
} from './routes/identities/identities.schemas.js';
export {
  userParamsSchema,
  identityParamsSchema,
  createIdentityBodySchema,
  updateIdentityBodySchema,
  identityResponseSchema,
  identityListResponseSchema,
} from './routes/identities/identities.schemas.js';

export type {
  AgentMessage,
  AgentEvent,
  AgentRunInput,
  AgentSendInput,
  AgentProvider,
} from './services/agent/agent.js';
export { AgentService } from './services/agent/agent.js';
export { AgentError, AgentNotFoundError } from './services/agent/agent.errors.js';
export { createClaudeAgentProvider } from './services/agent/agent.claude.js';

export type { MessageQueue } from './services/agent/agent.queue.js';
export { createMessageQueue } from './services/agent/agent.queue.js';

export type {
  EnsureBareCloneInput,
  CreateWorktreeInput,
  RemoveWorktreeInput,
  CommitInput,
  PushInput,
  FetchInput,
  ChangedFile,
  GetChangedFilesInput,
  GetDiffInput,
  GetFileHashInput,
  GetFileContentInput,
  ListBranchesInput,
} from './services/git/git.js';
export { GitService, repoHash } from './services/git/git.js';
export { GitError, GitCloneError, GitWorktreeError, GitDiffError, GitCommitError, GitPushError } from './services/git/git.errors.js';

export type { FileReview, MarkReviewedInput, UnmarkReviewedInput, ListBySessionInput } from './services/file-review/file-review.js';
export { FileReviewService } from './services/file-review/file-review.js';

export type { Repo, CreateRepoInput, UpdateRepoInput } from './services/repo/repo.js';
export { RepoService } from './services/repo/repo.js';
export {
  RepoError,
  RepoNotFoundError,
  RepoForbiddenError,
} from './services/repo/repo.errors.js';

export type { Session, CreateSessionInput, UpdateSessionStatusInput } from './services/session/session.js';
export { SessionService } from './services/session/session.js';
export {
  SessionError,
  SessionNotFoundError,
  SessionForbiddenError,
} from './services/session/session.errors.js';
export { startSession, sendSessionMessage, interruptSession, stopSession, revertSession } from './services/session/session.runner.js';

export type { Message, CreateMessageInput } from './services/message/message.js';
export { MessageService } from './services/message/message.js';

export type { SessionEvent, UserEvent, SessionEventListener, UserEventListener } from './sse/event-bus.js';
export { EventBusService } from './sse/event-bus.js';
export { streamSessionEvents, streamUserEvents } from './sse/stream.js';

export { registerEventRoutes } from './routes/events/events.js';

export type { PersistedSessionEvent } from './services/session-event/session-event.js';
export { SessionEventService } from './services/session-event/session-event.js';

export { registerRepoRoutes } from './routes/repos/repos.js';

export type {
  RepoParams,
  CreateRepoBody,
  UpdateRepoBody,
  RepoResponseData,
  RepoListResponseData,
} from './routes/repos/repos.schemas.js';
export {
  repoParamsSchema,
  createRepoBodySchema,
  updateRepoBodySchema,
  repoResponseSchema,
  repoListResponseSchema,
} from './routes/repos/repos.schemas.js';

export { registerSessionRoutes } from './routes/sessions/sessions.js';
export { registerReviewRoutes } from './routes/sessions/sessions.review.js';

export type {
  SessionParams,
  CreateSessionBody,
  SendMessageBody,
  RevertSessionBody,
  MessageResponseData,
  MessageListResponseData,
  SessionResponseData,
  SessionListResponseData,
} from './routes/sessions/sessions.schemas.js';
export {
  sessionParamsSchema,
  createSessionBodySchema,
  sendMessageBodySchema,
  revertSessionBodySchema,
  messageResponseSchema,
  messageListResponseSchema,
  sessionResponseSchema,
  sessionListResponseSchema,
} from './routes/sessions/sessions.schemas.js';

export type {
  ReviewFile,
  ReviewFilesQuery,
  ReviewFilesResponse,
  ReviewDiffQuery,
  ReviewDiffResponse,
  ReviewBranchesResponse,
  ReviewMarkBody,
  ReviewPushBody,
  ReviewPushResponse,
} from './routes/sessions/sessions.review.schemas.js';
export {
  reviewFileSchema,
  reviewFilesQuerySchema,
  reviewFilesResponseSchema,
  reviewDiffQuerySchema,
  reviewDiffResponseSchema,
  reviewBranchesResponseSchema,
  reviewMarkBodySchema,
  reviewPushBodySchema,
  reviewPushResponseSchema,
} from './routes/sessions/sessions.review.schemas.js';
