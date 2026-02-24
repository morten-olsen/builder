import { useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';

type SessionInputProps = {
  onSend: (message: string) => void;
  isSending: boolean;
  actions?: React.ReactNode;
};

const SessionInput = ({ onSend, isSending, actions }: SessionInputProps): React.ReactNode => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(message);
    setMessage('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-border-base bg-surface-1 p-3"
    >
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="send a message to the agent..."
          className="flex-1"
        />
        <Button type="submit" disabled={isSending || !message.trim()}>
          send
        </Button>
        {actions && (
          <div className="flex items-center gap-1.5">
            {actions}
          </div>
        )}
      </div>
    </form>
  );
};

export { SessionInput };
