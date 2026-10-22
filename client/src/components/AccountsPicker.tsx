import { ChevronsUpDown } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import type { Account } from '@/api/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type Props = {
  /** Accessible name of the trigger button, for example "Filtrar por conta". */
  label: string;
  accounts: Account[];
  /** The chosen account ids. Empty means every account. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** When the trigger sits inside a <Field>, pass the field's id so its <label> names the button. */
  id?: string;
};

/** What the trigger says: "Todas as contas", the one account's name, or "2 contas". */
function summary(accounts: Account[], value: string[]): string {
  if (value.length === 0) return 'Todas as contas';
  if (value.length === 1) return accounts.find((account) => account.id === value[0])?.label ?? '1 conta';
  return `${value.length} contas`;
}

/**
 * A trigger button that opens a list of accounts with a checkbox each, so any set of
 * accounts can be chosen. Nothing checked means every account. The same look as the
 * category picker, so the two filters sit side by side as one family.
 */
export function AccountsPicker({ label, accounts, value, onChange, id }: Props): ReactElement {
  const [open, setOpen] = useState(false);

  function toggle(accountId: string, checked: boolean) {
    // Keeps the order of the account list, whatever order the boxes were ticked in.
    const next = accounts.filter((account) => (account.id === accountId ? checked : value.includes(account.id))).map((account) => account.id);
    onChange(next);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={id ? undefined : label}
          className={cn(
            'flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-base text-foreground shadow-xs outline-hidden md:text-sm',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          <span className="truncate">{summary(accounts, value)}</span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          aria-label={label}
          className="z-50 flex max-h-80 min-w-[var(--radix-popover-trigger-width)] flex-col gap-0.5 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {accounts.length === 0 ? <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma conta</p> : null}
          {accounts.map((account) => (
            <label key={account.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-hover md:min-h-8">
              <Checkbox checked={value.includes(account.id)} onCheckedChange={(next) => toggle(account.id, next === true)} />
              {account.label}
            </label>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
