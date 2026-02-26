import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';

import { useAuth } from '../auth/auth';
import { Alert } from '../components/ui/alert.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';

const searchSchema = z.object({
  redirect: z.string().optional(),
});

const LoginPage = (): React.ReactNode => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(id, password);
      await navigate({ to: redirect ?? '/dashboard' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="relative mx-auto mb-3 flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 rotate-45 rounded-sm border border-accent/50" />
            <div className="h-2 w-2 rounded-full bg-accent" />
          </div>
          <h1 className="font-condensed text-lg font-semibold uppercase tracking-widest text-text-bright">Builder</h1>
          <p className="mt-1 font-mono text-xs text-text-muted">coding agent orchestrator</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border-base bg-surface-1 p-5">
          {error && (
            <div className="mb-3">
              <Alert color="danger">{error}</Alert>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div>
              <Label htmlFor="id">User ID</Label>
              <Input
                id="id"
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="alice"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} fullWidth>
              {isSubmitting ? 'signing in...' : 'sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginPage,
});

export { Route };
