class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

class InvalidCredentialsError extends AuthError {
  constructor() {
    super('Invalid id or password');
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
    super('Invalid or expired token');
    this.name = 'InvalidTokenError';
  }
}

class UserNotFoundError extends AuthError {
  constructor() {
    super('User not found');
    this.name = 'UserNotFoundError';
  }
}

export { AuthError, InvalidCredentialsError, UserAlreadyExistsError, InvalidTokenError, UserNotFoundError };
