import { AppError } from '../../errors/errors.js';

class TerminalError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message);
    this.name = 'TerminalError';
  }
}

class TerminalNotFoundError extends TerminalError {
  constructor() {
    super('Terminal not found', 404);
    this.name = 'TerminalNotFoundError';
  }
}

class TerminalAlreadyExistsError extends TerminalError {
  constructor() {
    super('Terminal already exists', 409);
    this.name = 'TerminalAlreadyExistsError';
  }
}

export { TerminalError, TerminalNotFoundError, TerminalAlreadyExistsError };
