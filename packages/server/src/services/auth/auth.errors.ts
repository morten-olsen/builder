class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

class InvalidCredentialsError extends AuthError {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

class EmailAlreadyExistsError extends AuthError {
  constructor() {
    super('Email already exists');
    this.name = 'EmailAlreadyExistsError';
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

export { AuthError, InvalidCredentialsError, EmailAlreadyExistsError, InvalidTokenError, UserNotFoundError };
