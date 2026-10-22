import { useCallback, useState } from 'react';

/**
 * Which lines are ticked on a list. The selection belongs to the query the list answers:
 * when the query changes (a filter, the month or the person) it starts empty, and it stays
 * empty if the query comes back. A line that leaves the list also leaves the selection.
 * `set`, `setMany` and `clear` keep the same identity until the query changes, so memoised rows that
 * receive them do not redraw when another row is ticked.
 */
export function useLineSelection(queryKey: string, lineIds: readonly string[]) {
  const [state, setState] = useState({ queryKey, ids: [] as string[] });
  // Starts over while rendering, the way a changed prop resets a piece of state: no effect, no flash of the old selection.
  if (state.queryKey !== queryKey) setState({ queryKey, ids: [] });

  const present = new Set(lineIds);
  const ids = state.queryKey === queryKey ? state.ids.filter((id) => present.has(id)) : [];

  const set = useCallback(
    (id: string, selected: boolean) =>
      setState((current) => {
        const kept = current.queryKey === queryKey ? current.ids.filter((other) => other !== id) : [];
        return { queryKey, ids: selected ? [...kept, id] : kept };
      }),
    [queryKey],
  );
  /** Ticks or unticks every listed line at once. Lines it is not told about keep their state. */
  const setMany = useCallback(
    (changed: readonly string[], selected: boolean) =>
      setState((current) => {
        const listed = new Set(changed);
        const kept = current.queryKey === queryKey ? current.ids.filter((id) => !listed.has(id)) : [];
        return { queryKey, ids: selected ? [...kept, ...listed] : kept };
      }),
    [queryKey],
  );
  const clear = useCallback(() => setState({ queryKey, ids: [] }), [queryKey]);

  return { ids, isSelected: (id: string) => ids.includes(id), set, setMany, clear };
}

/** How the "select all shown" box reads: ticked when every shown line is selected, mixed when only some are. */
export function shownSelectionState(shownIds: readonly string[], isSelected: (id: string) => boolean): boolean | 'indeterminate' {
  const selectedCount = shownIds.filter(isSelected).length;
  if (selectedCount === 0) return false;
  return selectedCount === shownIds.length ? true : 'indeterminate';
}
