import { cn } from '@/lib/utils';

/** One entry of a legend: the name of a colour and the colour itself (a `var(--...)` or any CSS colour). */
export interface LegendItem {
  label: string;
  color: string;
}

/**
 * The key to a chart's colours: a swatch and a name for each, side by side, wrapping onto
 * more lines on a narrow screen. `label` names the list for screen readers.
 * Gastos por categoria and the Orçamento split chart both use it.
 */
export function Legend({ label, items, className }: { label: string; items: LegendItem[]; className?: string }) {
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
