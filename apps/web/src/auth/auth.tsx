import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

import { getClient, setToken as persistToken, clearToken, hasToken } from '../client/client';

type User = {
  id: string;
  createdAt: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (id: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

const AuthProvider = ({ children }: AuthProviderProps): ReactNode => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      setIsLoading(false);
      return;
    }

    const validate = async (): Promise<void> => {
      const { data, error } = await getClient().api.GET('/api/auth/me');
      if (error || !data) {
        clearToken();
      } else {
        setUser(data);
      }
      setIsLoading(false);
    };

    void validate();
  }, []);

  const login = useCallback(async (id: string, password: string): Promise<void> => {
    const { data, error } = await getClient().api.POST('/api/auth/login', {
      body: { id, password },
    });
    if (error || !data) {
      throw new Error(error?.error ?? 'Login failed');
    }
    persistToken(data.token);
    flushSync(() => {
      setUser(data.user);
    });
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext value={{ user, isLoading, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext>
  );
};

const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

export type { AuthState, User };
export { AuthContext, AuthProvider, useAuth };
