class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

class SessionNotFoundError extends SessionError {
  constructor() {
    super('Session not found');
    this.name = 'SessionNotFoundError';
  }
}

class SessionForbiddenError extends SessionError {
  constructor() {
    super('Forbidden');
    this.name = 'SessionForbiddenError';
  }
}

export { SessionError, SessionNotFoundError, SessionForbiddenError };
