import { AppError } from '../../errors/errors.js';

class NotificationError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message);
    this.name = 'NotificationError';
  }
}

class NotificationChannelNotFoundError extends NotificationError {
  constructor() {
    super('Notification channel not found', 404);
    this.name = 'NotificationChannelNotFoundError';
  }
}

class NotificationProviderNotFoundError extends NotificationError {
  constructor(provider: string) {
    super(`Notification provider not found: ${provider}`, 404);
    this.name = 'NotificationProviderNotFoundError';
  }
}

class NotificationForbiddenError extends NotificationError {
  constructor() {
    super('Forbidden', 403);
    this.name = 'NotificationForbiddenError';
  }
}

export {
  NotificationError,
  NotificationChannelNotFoundError,
  NotificationProviderNotFoundError,
  NotificationForbiddenError,
};
