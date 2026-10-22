import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactElement } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Input } from '@/components/ui/input';
import { foldText } from '@/lib/format';
import { cn } from '@/lib/utils';

export type PickerOption = { id: string; name: string };

type Props = {
  /** Accessible name of the trigger button, e.g. "Categoria de Uber" or "Filtrar por categoria". */
  label: string;
  /** '' is a valid id (e.g. "Sem categoria" or "Todas as categorias"). */
  value: string;
  options: PickerOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
  /** Words the trigger shows in place of the chosen option's name, for a picker that acts at once, such as "Categoria" on the batch bar. */
  triggerText?: string;
  /** When the trigger sits inside a <Field>, pass the field's id so its <label> names the button. */
  id?: string;
  /** Set by `Field`, which ties its hint or error to the trigger. */
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/**
 * A trigger button that opens a searchable list of categories, replacing a long native
 * `<select>`. The list filters as you type, ignoring accents and case.
 */
export function CategoryPicker({
  label,
  value,
  options,
  onChange,
  disabled,
  className,
  triggerText,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: Props): ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Keyed by option id, so a filtered list never leaves a stale entry behind and nothing is reset while rendering.
  const optionRefs = useRef(new Map<string, HTMLLIElement>());
  const uid = useId();

  const filtered = options.filter((option) => foldText(option.name).includes(foldText(query)));
  const current = options.find((option) => option.id === value) ?? options[0];

  const highlightedId = filtered[highlight]?.id;
  useEffect(() => {
    if (!open || highlightedId === undefined) return;
    optionRefs.current.get(highlightedId)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, highlightedId]);

  function optionDomId(optionId: string) {
    return `${uid}-option-${optionId}`;
  }

  function pick(option: PickerOption) {
    onChange(option.id);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setQuery('');
      const index = options.findIndex((option) => option.id === value);
      setHighlight(index >= 0 ? index : 0);
    }
    setOpen(next);
  }

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setHighlight(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((previous) => (filtered.length === 0 ? 0 : (previous + 1) % filtered.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((previous) => (filtered.length === 0 ? 0 : (previous - 1 + filtered.length) % filtered.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) pick(option);
    }
  }

  return (
    <PopoverPrimitive.Root modal open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={id ? undefined : label}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(
            'flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-base text-foreground shadow-xs outline-hidden md:text-sm',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
            className,
          )}
        >
          <span title={triggerText ?? current?.name} className="truncate">{triggerText ?? current?.name ?? ''}</span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="z-50 flex max-h-80 min-w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="p-2 pb-1">
            <Input
              ref={inputRef}
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder="Buscar categoria"
              aria-label="Buscar categoria"
              aria-activedescendant={filtered[highlight] ? optionDomId(filtered[highlight].id) : undefined}
            />
          </div>
          <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma categoria encontrada</li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.id}
                  id={optionDomId(option.id)}
                  role="option"
                  aria-selected={option.id === value}
                  ref={(element) => {
                    if (element) optionRefs.current.set(option.id, element);
                    else optionRefs.current.delete(option.id);
                  }}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm',
                    index === highlight && 'bg-hover',
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(option)}
                >
                  {option.name}
                  {option.id === value ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
                </li>
              ))
            )}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
