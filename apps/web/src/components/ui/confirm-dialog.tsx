import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Button } from './button.js';

type ConfirmDialogProps = {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmColor?: 'accent' | 'danger';
  onConfirm: () => void;
};

const ConfirmDialog = ({
  trigger,
  title,
  description,
  confirmLabel = 'confirm',
  confirmColor = 'danger',
  onConfirm,
}: ConfirmDialogProps): React.ReactNode => {
  const [open, setOpen] = useState(false);

  const handleConfirm = (): void => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={<span />}>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border-base bg-surface-1 p-5 shadow-xl shadow-black/40">
          <Dialog.Title className="font-mono text-sm font-medium text-text-bright">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1.5 font-mono text-xs text-text-dim">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close
              render={<Button variant="ghost" color="accent" size="sm" />}
            >
              cancel
            </Dialog.Close>
            <Button
              variant={confirmColor === 'danger' ? 'ghost' : 'primary'}
              color={confirmColor === 'danger' ? 'danger' : undefined}
              size="sm"
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export type { ConfirmDialogProps };
export { ConfirmDialog };
