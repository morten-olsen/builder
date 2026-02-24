import { getStatusColor } from '../../utils/session.js';

type StatusDotProps = {
  status: string;
  size?: 'sm' | 'md';
};

const StatusDot = ({ status, size = 'sm' }: StatusDotProps): React.ReactNode => {
  const sizeClass = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5';
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${sizeClass} ${getStatusColor(status).dot}`}
    />
  );
};

export type { StatusDotProps };
export { StatusDot };
