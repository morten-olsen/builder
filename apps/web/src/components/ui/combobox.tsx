import { Combobox as BaseCombobox } from '@base-ui/react/combobox';

type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const Combobox = ({
  options,
  value,
  onValueChange,
  placeholder = 'search...',
  disabled,
}: ComboboxProps): React.ReactNode => {
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <BaseCombobox.Root
      value={selected}
      onValueChange={(item) => onValueChange(item?.value ?? '')}
      items={options}
      itemToStringLabel={(item) => item?.label ?? ''}
      disabled={disabled}
    >
      <div className="relative flex w-full items-center">
        <BaseCombobox.Input
          placeholder={placeholder}
          className="w-full rounded border border-border-base bg-surface-2 px-3 py-2 pr-14 font-mono text-sm text-text-bright transition-all placeholder:text-text-muted focus:border-accent/50 focus:shadow-[0_0_8px_rgba(0,229,255,0.12)] focus:outline-none disabled:opacity-40 data-[popup-open]:border-accent/50"
        />
        <BaseCombobox.Clear
          className="absolute right-7 flex h-4 w-4 items-center justify-center text-text-muted hover:text-text-bright data-[hidden]:hidden"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </BaseCombobox.Clear>
        <BaseCombobox.Trigger
          className="absolute right-2 flex h-4 w-4 items-center justify-center text-text-muted"
        >
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
        </BaseCombobox.Trigger>
      </div>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner className="z-50" sideOffset={4}>
          <BaseCombobox.Popup className="max-h-64 min-w-[var(--anchor-width)] overflow-y-auto rounded border border-border-bright bg-surface-2 py-1 shadow-lg shadow-black/40">
            <BaseCombobox.Empty className="px-3 py-2 font-mono text-sm text-text-muted">
              no matches
            </BaseCombobox.Empty>
            <BaseCombobox.List>
              {(item: ComboboxOption) => (
                <BaseCombobox.Item
                  key={item.value}
                  value={item}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-text-base outline-none data-[highlighted]:bg-surface-3 data-[highlighted]:text-text-bright data-[selected]:text-accent-bright"
                >
                  <BaseCombobox.ItemIndicator className="shrink-0 text-accent">
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
                  </BaseCombobox.ItemIndicator>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono">{item.label}</span>
                    {item.description && (
                      <div className="truncate text-xs text-text-muted">
                        {item.description}
                      </div>
                    )}
                  </div>
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
};

export type { ComboboxProps, ComboboxOption };
export { Combobox };
