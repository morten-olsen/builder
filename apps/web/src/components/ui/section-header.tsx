type SectionHeaderSize = 'sm' | 'md';

type SectionHeaderProps = {
  size?: SectionHeaderSize;
  children: React.ReactNode;
  className?: string;
};

const sizeStyles: Record<SectionHeaderSize, string> = {
  sm: 'text-ui',
  md: 'text-xs',
};

const SectionHeader = ({
  size = 'md',
  children,
  className = '',
}: SectionHeaderProps): React.ReactNode => (
  <h2
    className={`font-condensed font-semibold uppercase tracking-wider text-text-dim ${sizeStyles[size]} ${className}`}
  >
    {children}
  </h2>
);

export type { SectionHeaderProps, SectionHeaderSize };
export { SectionHeader };
