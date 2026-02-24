class RepoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepoError';
  }
}

class RepoNotFoundError extends RepoError {
  constructor() {
    super('Repo not found');
    this.name = 'RepoNotFoundError';
  }
}

class RepoForbiddenError extends RepoError {
  constructor() {
    super('Forbidden');
    this.name = 'RepoForbiddenError';
  }
}

export { RepoError, RepoNotFoundError, RepoForbiddenError };
