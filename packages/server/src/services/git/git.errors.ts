import { AppError } from '../../errors/errors.js';

class GitError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(statusCode, message);
    this.name = 'GitError';
  }
}

class GitCloneError extends GitError {
  constructor(message = 'Failed to clone repository') {
    super(message);
    this.name = 'GitCloneError';
  }
}

class GitWorktreeError extends GitError {
  constructor(message = 'Worktree operation failed') {
    super(message);
    this.name = 'GitWorktreeError';
  }
}

class GitDiffError extends GitError {
  constructor(message = 'Diff operation failed') {
    super(message);
    this.name = 'GitDiffError';
  }
}

class GitCommitError extends GitError {
  constructor(message = 'Commit operation failed') {
    super(message);
    this.name = 'GitCommitError';
  }
}

class GitPushError extends GitError {
  constructor(message = 'Push operation failed') {
    super(message);
    this.name = 'GitPushError';
  }
}

export { GitError, GitCloneError, GitWorktreeError, GitDiffError, GitCommitError, GitPushError };
