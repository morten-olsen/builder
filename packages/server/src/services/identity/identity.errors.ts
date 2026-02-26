import { AppError } from '../../errors/errors.js';

class IdentityError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message);
    this.name = 'IdentityError';
  }
}

class IdentityNotFoundError extends IdentityError {
  constructor() {
    super('Identity not found', 404);
    this.name = 'IdentityNotFoundError';
  }
}

class IdentityForbiddenError extends IdentityError {
  constructor() {
    super('Forbidden', 403);
    this.name = 'IdentityForbiddenError';
  }
}

export { IdentityError, IdentityNotFoundError, IdentityForbiddenError };
