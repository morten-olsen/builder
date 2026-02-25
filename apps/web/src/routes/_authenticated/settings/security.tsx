import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { getClient } from '../../../client/client.js';
import { Alert } from '../../../components/ui/alert.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';

const SecurityPage = (): React.ReactNode => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [success, setSuccess] = useState(false);

  const changePassword = useMutation({
    mutationFn: async () => {
      const { error } = await getClient().api.PUT('/api/auth/password', {
        body: { currentPassword, newPassword },
      });
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setValidationError('');
      setSuccess(true);
    },
    onError: () => {
      setSuccess(false);
    },
  });

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setSuccess(false);
    setValidationError('');

    if (newPassword.length < 8) {
      setValidationError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    changePassword.mutate();
  };

  return (
    <div>
      <p className="mb-4 font-mono text-xs text-text-muted">change your account password</p>

      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <div>
          <Label>Current password</Label>
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>New password</Label>
          <Input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>Confirm new password</Label>
          <Input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {validationError && <Alert color="danger">{validationError}</Alert>}
        {changePassword.error && (
          <Alert color="danger">
            {changePassword.error instanceof Error ? changePassword.error.message : 'Failed to change password'}
          </Alert>
        )}
        {success && <Alert color="success">Password changed successfully.</Alert>}

        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'changing...' : 'change password'}
        </Button>
      </form>
    </div>
  );
};

const Route = createFileRoute('/_authenticated/settings/security')({
  component: SecurityPage,
});

export { Route };
