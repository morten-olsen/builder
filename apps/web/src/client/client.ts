import { createBuilderClient, type BuilderClient } from '@morten-olsen/builder-client';

let instance: BuilderClient | null = null;

const TOKEN_KEY = 'builder_token';

const getClient = (): BuilderClient => {
  if (!instance) {
    const token = localStorage.getItem(TOKEN_KEY) ?? undefined;
    instance = createBuilderClient({ baseUrl: '/api', token });
  }
  return instance;
};

const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  if (instance) {
    instance.setToken(token);
  }
};

const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  instance = null;
};

const hasToken = (): boolean => {
  return localStorage.getItem(TOKEN_KEY) !== null;
};

export { getClient, setToken, clearToken, hasToken };
