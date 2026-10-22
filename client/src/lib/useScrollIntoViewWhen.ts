import { useEffect, useRef } from 'react';

/**
 * Scrolls the element on `ref` into view, just enough to show it, each time `show`
 * turns true. A panel that opens below the fold on a phone then does not hide
 * under the bottom bar. It does not run again on later renders.
 */
export function useScrollIntoViewWhen<T extends HTMLElement>(show: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (show) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [show]);
  return ref;
}
