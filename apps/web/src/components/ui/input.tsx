type InputSize = 'sm' | 'md';

type InputProps = {
  inputSize?: InputSize;
} & React.InputHTMLAttributes<HTMLInputElement>;

type TextareaProps = {
  inputSize?: InputSize;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
};

const baseStyles =
  'block w-full rounded border border-border-base bg-surface-2 font-mono text-text-bright placeholder-text-muted transition-all focus:border-accent/50 focus:shadow-[0_0_8px_rgba(0,229,255,0.12)] focus:outline-none';

const Input = ({ inputSize = 'md', className = '', ...props }: InputProps): React.ReactNode => (
  <input className={`${baseStyles} ${sizeStyles[inputSize]} ${className}`} {...props} />
);

const Textarea = ({ inputSize = 'md', className = '', ...props }: TextareaProps): React.ReactNode => (
  <textarea className={`${baseStyles} resize-none ${sizeStyles[inputSize]} ${className}`} {...props} />
);

export type { InputProps, TextareaProps, InputSize };
export { Input, Textarea };
