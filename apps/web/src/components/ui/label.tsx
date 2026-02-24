type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = ({ className = '', ...props }: LabelProps): React.ReactNode => (
  <label
    className={`mb-1 block font-mono text-ui uppercase tracking-wider text-text-muted ${className}`}
    {...props}
  />
);

export type { LabelProps };
export { Label };
