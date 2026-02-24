type BadgeVariant = 'status' | 'count' | 'tag';
type BadgeColor = 'accent' | 'danger' | 'success' | 'info' | 'warning' | 'neutral';

type BadgeProps = {
  variant?: BadgeVariant;
  color?: BadgeColor;
  children: React.ReactNode;
};

const statusColors: Record<BadgeColor, string> = {
  accent: 'border-accent/30 bg-accent-subtle text-accent',
  danger: 'border-danger/30 bg-danger/5 text-danger',
  success: 'border-success/30 bg-success/5 text-success',
  info: 'border-info/30 bg-info/5 text-info',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  neutral: 'border-border-base bg-surface-2 text-text-muted',
};

const variantBase: Record<BadgeVariant, string> = {
  status: 'rounded border px-1.5 py-0.5 font-mono text-ui',
  count: 'rounded-full bg-surface-3 px-1.5 py-0.5 font-mono text-ui text-text-dim',
  tag: 'rounded bg-surface-3 px-2 py-0.5 font-mono text-ui text-text-dim',
};

const Badge = ({ variant = 'status', color = 'neutral', children }: BadgeProps): React.ReactNode => {
  const base = variantBase[variant];
  const colorStyle = variant === 'status' ? statusColors[color] : '';

  return <span className={`${base} ${colorStyle}`}>{children}</span>;
};

export type { BadgeProps, BadgeVariant, BadgeColor };
export { Badge };
