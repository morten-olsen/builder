type CardPadding = 'sm' | 'md' | 'lg';

type CardProps = {
  interactive?: boolean;
  padding?: CardPadding;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

const paddingStyles: Record<CardPadding, string> = {
  sm: 'px-3 py-2.5',
  md: 'px-4 py-3',
  lg: 'p-5',
};

const Card = ({
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps): React.ReactNode => {
  const base = 'rounded-lg border border-border-base bg-surface-1';
  const hover = interactive
    ? 'transition-colors hover:border-border-bright hover:bg-surface-2'
    : '';

  return (
    <div className={`${base} ${hover} ${paddingStyles[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export type { CardProps, CardPadding };
export { Card };
