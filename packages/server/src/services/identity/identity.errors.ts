class IdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityError';
  }
}

class IdentityNotFoundError extends IdentityError {
  constructor() {
    super('Identity not found');
    this.name = 'IdentityNotFoundError';
  }
}

class IdentityForbiddenError extends IdentityError {
  constructor() {
    super('Forbidden');
    this.name = 'IdentityForbiddenError';
  }
}

export { IdentityError, IdentityNotFoundError, IdentityForbiddenError };
