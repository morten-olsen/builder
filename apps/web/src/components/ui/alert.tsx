type AlertColor = 'info' | 'success' | 'danger' | 'warning';

type AlertProps = {
  color: AlertColor;
  children: React.ReactNode;
};

const colorStyles: Record<AlertColor, string> = {
  info: 'border-info/20 bg-info/5 text-info',
  success: 'border-success/20 bg-success/5 text-success',
  danger: 'border-danger/20 bg-danger/5 text-danger',
  warning: 'border-warning/20 bg-warning/5 text-warning',
};

const Alert = ({ color, children }: AlertProps): React.ReactNode => (
  <div className={`rounded border px-3 py-2 font-mono text-xs ${colorStyles[color]}`}>
    {children}
  </div>
);

export type { AlertProps, AlertColor };
export { Alert };
