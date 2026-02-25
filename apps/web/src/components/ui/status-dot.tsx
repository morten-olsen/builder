import { getStatusColor } from '../../utils/session.js';

type StatusDotProps = {
  status: string;
  size?: 'sm' | 'md';
};

const animatedStatuses = new Set(['running', 'pending']);

const StatusDot = ({ status, size = 'sm' }: StatusDotProps): React.ReactNode => {
  const sizeClass = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5';
  const pingSize = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5';
  const colorClasses = getStatusColor(status);
  const shouldAnimate = animatedStatuses.has(status);

  return (
    <span className={`relative inline-flex shrink-0 ${sizeClass}`}>
      {shouldAnimate && (
        <span
          className={`absolute inset-0 rounded-full ${pingSize} ${colorClasses.dotBase} animate-ping opacity-75`}
        />
      )}
      <span
        className={`relative inline-block rounded-full ${sizeClass} ${colorClasses.dotBase}`}
      />
    </span>
  );
};

export type { StatusDotProps };
export { StatusDot };
