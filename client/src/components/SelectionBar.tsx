import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  /** How many lines are selected. The bar shows only while this is above zero, so the parent decides that. */
  count: number;
  /** The actions, such as "Categoria" or "Tag". Each screen brings its own. */
  children?: ReactNode;
  /** Unselects every line. */
  onClear: () => void;
  /**
   * Where the bar sits on a phone. `bottom` (the default) fixes it above the bottom tabs and makes
   * room under the list. `top` keeps it sticky at the top, for a screen that already has its own bar at the bottom.
   * From `md` up it always sticks to the top of the list.
   */
  phonePlacement?: 'bottom' | 'top';
};

/** "1 selecionado", "3 selecionados". */
export function selectedText(count: number): string {
  return `${count} ${count === 1 ? 'selecionado' : 'selecionados'}`;
}

/**
 * The bar of a list while some lines are selected: how many, the actions the screen gives it, and
 * "Limpar seleção". From `md` up it sticks to the top of the screen while the list scrolls under it.
 * On a phone it is fixed at the bottom, 1 rem above the 4 rem bottom tabs, and `html.selection-bar-open`
 * (index.css) reserves scroll room for it. The count and "Limpar seleção" share the first row, and
 * the actions wrap below. Its tallest steady height at 375 px, with the actions on two rows, is
 * 1 px border + 12 px padding + 36 px first row + 8 px gap + 36 px + 8 px gap + 36 px + 12 px padding +
 * 1 px border = 150 px; the page pads its list by 160 px (`pb-40`) and index.css reserves 15.5 rem
 * (the bar, the tabs and the gaps).
 */
export function SelectionBar({ count, children, onClear, phonePlacement = 'bottom' }: Props) {
  const bottomOnPhone = phonePlacement === 'bottom';
  useEffect(() => {
    if (!bottomOnPhone) return;
    document.documentElement.classList.add('selection-bar-open');
    return () => document.documentElement.classList.remove('selection-bar-open');
  }, [bottomOnPhone]);

  return (
    <div
      role="region"
      aria-label="Lançamentos selecionados"
      className={cn(
        'z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-background p-3 shadow-sm',
        bottomOnPhone ? 'fixed inset-x-4 bottom-20 md:sticky md:inset-x-auto md:top-2 md:bottom-auto' : 'sticky top-2',
      )}
    >
      <span aria-live="polite" className="text-sm font-medium">
        {selectedText(count)}
      </span>
      <Button type="button" variant="ghost" className="ml-auto md:order-last" onClick={onClear}>
        Limpar seleção
      </Button>
      {children ? <div className="flex basis-full flex-wrap items-center gap-2 md:basis-auto">{children}</div> : null}
    </div>
  );
}
