import { Select as BaseSelect } from '@base-ui/react/select';

type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectSize = 'sm' | 'md';

type SelectProps = {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  selectSize?: SelectSize;
  disabled?: boolean;
  required?: boolean;
  name?: string;
};

const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
};

const Select = ({
  options,
  value,
  onValueChange,
  placeholder = 'select...',
  selectSize = 'md',
  disabled,
  required,
  name,
}: SelectProps): React.ReactNode => {
  const items = options.map((o) => ({ value: o.value, label: o.label }));

  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(v) => onValueChange(v ?? '')}
      disabled={disabled}
      required={required}
      name={name}
      items={items}
    >
      <BaseSelect.Trigger
        className={`flex w-full items-center justify-between rounded border border-border-base bg-surface-2 font-mono text-text-bright transition-all focus:border-accent/50 focus:shadow-[0_0_8px_rgba(0,229,255,0.12)] focus:outline-none disabled:opacity-40 data-[popup-open]:border-accent/50 ${sizeStyles[selectSize]}`}
      >
        <BaseSelect.Value
          className="min-w-0 truncate"
          placeholder={placeholder}
        />
        <BaseSelect.Icon className="ml-2 shrink-0 text-text-muted">
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-50" sideOffset={4}>
          <BaseSelect.Popup className="max-h-64 min-w-[var(--anchor-width)] overflow-y-auto rounded border border-border-bright bg-surface-2 py-1 shadow-lg shadow-black/40">
            {options.map((opt) => (
              <BaseSelect.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-text-base outline-none data-[highlighted]:bg-surface-3 data-[highlighted]:text-text-bright data-[selected]:text-accent-bright data-[disabled]:opacity-40"
              >
                <BaseSelect.ItemIndicator className="shrink-0 text-accent">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </BaseSelect.ItemIndicator>
                <div className="min-w-0 flex-1">
                  <BaseSelect.ItemText className="font-mono">
                    {opt.label}
                  </BaseSelect.ItemText>
                  {opt.description && (
                    <div className="truncate text-xs text-text-muted">
                      {opt.description}
                    </div>
                  )}
                </div>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
};

export type { SelectProps, SelectOption, SelectSize };
export { Select };
