import { type Key, type ReactNode, useId, useState } from 'react';
import { Button } from '@/components/ui/button';

/** How many rows a long list shows before "Ver todos". */
export const COLLAPSED_ROW_COUNT = 5;

type Props<T> = {
  /** Already sorted, largest first: the first rows are the ones shown while collapsed. */
  items: readonly T[];
  itemKey: (item: T) => Key;
  renderItem: (item: T) => ReactNode;
};

/**
 * A list that shows its first five rows, then a "Ver todos (N)" button that shows the rest in place.
 * Open, the button reads "Mostrar menos" and collapses again. No button at five rows or fewer.
 * The button is one element in both states, so keyboard focus stays on it after each press.
 */
export function ShowMoreList<T>({ items, itemKey, renderItem }: Props<T>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const canCollapse = items.length > COLLAPSED_ROW_COUNT;
  const shown = open && canCollapse ? items : items.slice(0, COLLAPSED_ROW_COUNT);
  return (
    <>
      <ul id={listId} className="flex flex-col gap-1">
        {shown.map((item) => (
          <li key={itemKey(item)}>{renderItem(item)}</li>
        ))}
      </ul>
      {canCollapse ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="self-start px-0 text-muted-foreground underline hover:text-foreground"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          {open ? 'Mostrar menos' : `Ver todos (${items.length})`}
        </Button>
      ) : null}
    </>
  );
}
