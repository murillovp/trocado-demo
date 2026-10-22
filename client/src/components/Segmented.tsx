import { RadioGroup } from 'radix-ui';
import { FOCUS_RING } from '@/lib/interaction';
import { cn } from '@/lib/utils';

type Props<T extends string> = {
  /** Names the group for assistive technology, for example "Filtrar por tipo". */
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
};

/**
 * One choice among a few filters, drawn as a grey track with the chosen option lifted
 * onto a white pill. It is a Radix radio group, not tabs: tabs promise a panel under
 * each option, and these only change a filter. A radio group also cannot end on
 * nothing, so a "show all" option has to be a real option. Arrow keys move the choice.
 * The row wraps on a phone instead of scrolling sideways.
 */
export function Segmented<T extends string>({ label, value, options, onChange, className }: Props<T>) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className={cn('flex w-fit max-w-full flex-wrap items-center gap-0.5 rounded-lg bg-muted p-[3px]', className)}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value || 'all'}
          value={option.value}
          className={cn(
            'inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-foreground/70 transition-colors hover:text-foreground',
            'data-[state=unchecked]:hover:bg-hover data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm',
            FOCUS_RING,
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
