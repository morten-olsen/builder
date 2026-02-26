import { AppError } from '../../errors/errors.js';

class RepoError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message);
    this.name = 'RepoError';
  }
}

class RepoNotFoundError extends RepoError {
  constructor() {
    super('Repo not found', 404);
    this.name = 'RepoNotFoundError';
  }
}

class RepoForbiddenError extends RepoError {
  constructor() {
    super('Forbidden', 403);
    this.name = 'RepoForbiddenError';
  }
}

export { RepoError, RepoNotFoundError, RepoForbiddenError };
