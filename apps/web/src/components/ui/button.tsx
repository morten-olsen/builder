type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';
type GhostColor = 'accent' | 'danger' | 'warning';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: GhostColor;
  fullWidth?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles: Record<ButtonVariant, string | Record<GhostColor, string>> = {
  primary:
    'bg-accent text-surface-0 font-medium hover:bg-accent-bright hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] focus:ring-1 focus:ring-accent disabled:opacity-40',
  secondary:
    'border border-accent/30 bg-accent-subtle text-accent hover:border-accent/50 hover:bg-accent-muted disabled:opacity-40',
  ghost: {
    accent:
      'border border-accent/20 text-accent/70 hover:border-accent/40 hover:bg-accent/5 hover:text-accent disabled:opacity-40',
    danger:
      'border border-danger/20 text-danger/70 hover:border-danger/40 hover:bg-danger/5 hover:text-danger disabled:opacity-40',
    warning:
      'border border-warning/20 text-warning/70 hover:border-warning/40 hover:bg-warning/5 hover:text-warning disabled:opacity-40',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-ui',
  md: 'px-4 py-2 text-xs',
};

const Button = ({
  variant = 'primary',
  size = 'md',
  color = 'accent',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps): React.ReactNode => {
  const base = 'rounded font-mono transition-all duration-150 focus:outline-none';
  const vStyle = variant === 'ghost'
    ? (variantStyles.ghost as Record<GhostColor, string>)[color]
    : variantStyles[variant] as string;
  const sStyle = sizeStyles[size];
  const wStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${base} ${vStyle} ${sStyle} ${wStyle} ${className}`}
      {...props}
    />
  );
};

export type { ButtonProps, ButtonVariant, ButtonSize, GhostColor };
export { Button };
