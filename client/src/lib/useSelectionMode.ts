import { useCallback, useState, useSyncExternalStore } from 'react';

/** True on a screen where the main pointer cannot hover: a phone or a tablet. The width plays no part. */
const TOUCH_QUERY = '(hover: none)';

function subscribeToPointer(onChange: () => void): () => void {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const isTouchScreen = () => window.matchMedia(TOUCH_QUERY).matches;

/** When the checkboxes of a list show: on hover or focus of their row, always, or not at all. */
export type SelectShow = 'hover' | 'always' | 'hidden';

/**
 * How a list shows its selection checkboxes. With a pointer they appear as the pointer or the
 * keyboard reaches a row, and on every row once a line is selected. On a touch screen there is no
 * hover, so they stay hidden until `toggle` turns selecting on ("Selecionar"), and `toggle` again
 * ("Cancelar") calls `clear` and hides them. The two cases follow `(hover: hover)` and
 * `(hover: none)`, not the width of the window.
 */
export function useSelectionMode(selectedCount: number, clear: () => void) {
  const touch = useSyncExternalStore(subscribeToPointer, isTouchScreen, () => false);
  const [picking, setPicking] = useState(false);

  const toggle = useCallback(() => {
    if (picking) clear();
    setPicking(!picking);
  }, [picking, clear]);

  const show: SelectShow = selectedCount > 0 ? 'always' : touch ? (picking ? 'always' : 'hidden') : 'hover';
  return { touch, picking, show, toggle };
}
