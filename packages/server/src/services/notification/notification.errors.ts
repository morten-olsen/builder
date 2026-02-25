class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

class NotificationChannelNotFoundError extends NotificationError {
  constructor() {
    super('Notification channel not found');
    this.name = 'NotificationChannelNotFoundError';
  }
}

class NotificationProviderNotFoundError extends NotificationError {
  constructor(provider: string) {
    super(`Notification provider not found: ${provider}`);
    this.name = 'NotificationProviderNotFoundError';
  }
}

class NotificationForbiddenError extends NotificationError {
  constructor() {
    super('Forbidden');
    this.name = 'NotificationForbiddenError';
  }
}

export {
  NotificationError,
  NotificationChannelNotFoundError,
  NotificationProviderNotFoundError,
  NotificationForbiddenError,
};
