import { AppError } from '../../errors/errors.js';

class AgentError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(statusCode, message);
    this.name = 'AgentError';
  }
}

class AgentNotFoundError extends AgentError {
  constructor(provider: string) {
    super(`Agent provider '${provider}' not found`);
    this.name = 'AgentNotFoundError';
  }
}

export { AgentError, AgentNotFoundError };
