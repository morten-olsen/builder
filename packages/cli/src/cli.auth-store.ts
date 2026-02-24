import fs from 'node:fs';
import path from 'node:path';

import type { Services } from '@morten-olsen/builder-server';
import { AuthService } from '@morten-olsen/builder-server';

import { BUILDER_HOME } from './cli.defaults.js';

type AuthData = {
  token: string;
  userId: string;
  email: string;
};

const AUTH_FILE = path.join(BUILDER_HOME, 'auth.json');

const saveAuth = (data: AuthData): void => {
  fs.mkdirSync(BUILDER_HOME, { recursive: true, mode: 0o700 });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
};

const loadAuth = (): AuthData | null => {
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
};

const clearAuth = (): void => {
  try {
    fs.unlinkSync(AUTH_FILE);
  } catch {
    // File may not exist, that's fine
  }
};

const requireAuth = async (services: Services): Promise<{ userId: string; email: string }> => {
  const auth = loadAuth();
  if (!auth) {
    throw new Error('Not logged in. Run `builder auth login` or `builder auth register` first.');
  }

  const authService = services.get(AuthService);
  const payload = await authService.verifyToken(auth.token);

  return { userId: payload.sub, email: payload.email };
};

export type { AuthData };
export { saveAuth, loadAuth, clearAuth, requireAuth };
