import { AppError } from '../../errors/errors.js';

class AuthError extends AppError {
  constructor(message: string, statusCode = 409) {
    super(statusCode, message);
    this.name = 'AuthError';
  }
}

class InvalidCredentialsError extends AuthError {
  constructor() {
    super('Invalid id or password', 401);
    this.name = 'InvalidCredentialsError';
  }
}

class UserAlreadyExistsError extends AuthError {
  constructor() {
    super('User already exists');
    this.name = 'UserAlreadyExistsError';
  }
}

class InvalidTokenError extends AuthError {
  constructor() {
    super('Invalid or expired token', 401);
    this.name = 'InvalidTokenError';
  }
}

class UserNotFoundError extends AuthError {
  constructor() {
    super('User not found', 404);
    this.name = 'UserNotFoundError';
  }
}

export { AuthError, InvalidCredentialsError, UserAlreadyExistsError, InvalidTokenError, UserNotFoundError };
