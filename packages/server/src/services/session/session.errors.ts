import { AppError } from '../../errors/errors.js';

class SessionError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message);
    this.name = 'SessionError';
  }
}

class SessionNotFoundError extends SessionError {
  constructor() {
    super('Session not found', 404);
    this.name = 'SessionNotFoundError';
  }
}

class SessionAlreadyExistsError extends SessionError {
  constructor() {
    super('Session already exists', 409);
    this.name = 'SessionAlreadyExistsError';
  }
}

class SessionForbiddenError extends SessionError {
  constructor() {
    super('Forbidden', 403);
    this.name = 'SessionForbiddenError';
  }
}

export { SessionError, SessionNotFoundError, SessionAlreadyExistsError, SessionForbiddenError };
