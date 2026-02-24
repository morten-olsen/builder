class AgentError extends Error {
  constructor(message: string) {
    super(message);
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
