import { createContext, useContext, type ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { SelectShow } from '@/lib/useSelectionMode';
import { cn } from '@/lib/utils';

const SelectShowContext = createContext<SelectShow>('hover');

/** Whether the checkbox column is drawn at all: false only while the boxes are `hidden`. Kept apart from the show mode so a memoised row that reads only this one does not redraw when a tick turns hover into always. */
const SelectColumnContext = createContext(true);

/** Tells every `SelectCell` below when to show its box. A list wraps its rows in it, with the value from `useSelectionMode`. */
export function SelectShowProvider({ value, children }: { value: SelectShow; children: ReactNode }) {
  return (
    <SelectShowContext.Provider value={value}>
      <SelectColumnContext.Provider value={value !== 'hidden'}>{children}</SelectColumnContext.Provider>
    </SelectShowContext.Provider>
  );
}

/** Whether the list's checkbox column is drawn. `LineDataList` and the row grids read it, so header and rows agree. */
export function useSelectColumn(): boolean {
  return useContext(SelectColumnContext);
}

/**
 * The first cell of a selectable row: the checkbox that selects the line. The row's grid
 * carries `group/row` so a pointer over the row, or focus anywhere in it, reveals the box.
 * Hidden by opacity, the box keeps its place and its tab stop, so the keyboard reaches it and
 * the row never shifts. On a touch screen before "Selecionar" the cell draws nothing (nothing
 * to tap by accident, nothing for a screen reader to list) and the row's grid has no column for
 * it (`useLineGrid`), so the row uses the full width. `checked` is `'indeterminate'` for the
 * header's box when only some lines are selected. The cell is as tall as the first line on a phone, so the box sits level with the name; the tap
 * area grows past the box.
 */
export function SelectCell({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean | 'indeterminate';
  onChange: (checked: boolean) => void;
}) {
  const show = useContext(SelectShowContext);
  if (show === 'hidden') return null;
  return (
    <span className="flex min-h-8 items-center lg:min-h-0">
      <Checkbox
        aria-label={label}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        className={cn(
          'relative after:absolute after:-inset-3.5 md:after:-inset-2.5',
          show === 'hover' &&
            '[@media(hover:hover)]:opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus-visible:opacity-100',
        )}
      />
    </span>
  );
}
