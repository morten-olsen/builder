import { useEffect, useCallback } from 'react';

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const MobileDrawer = ({ open, onClose, children }: MobileDrawerProps): React.ReactNode => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* Drawer */}
      <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
        {children}
      </aside>
    </div>
  );
};

export type { MobileDrawerProps };
export { MobileDrawer };
