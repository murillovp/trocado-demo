import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { createTag } from '@/api/endpoints';
import { useChange, useTags } from '@/api/queries';
import type { Tag } from '@/api/types';
import { Input } from '@/components/ui/input';
import { foldText } from '@/lib/format';
import { cn } from '@/lib/utils';
import { TAG_NAME_MAX_LENGTH } from '../../../shared/limits';

/** The look of the popover that holds a `TagList`, so every tag popover matches. */
export const TAG_POPOVER_CLASS =
  'z-50 flex max-h-80 w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md';

type Props = {
  /** The tags the list offers. Left out, it offers every tag of the household. */
  options?: Tag[];
  /** Called with the tag the user picked, or with the one he just created. The parent decides whether to close. */
  onPick: (tag: Tag) => void;
  /** Offers "Criar "…"" when the typed name matches no tag. Off for a list that only removes. */
  allowCreate?: boolean;
  /** Every tag that exists, so a typed name that an unlisted tag already has is not offered as new. Defaults to the household's tags. */
  known?: Tag[];
  /** What the search box is called, for assistive technology. */
  searchLabel?: string;
  /** Shown when the list has nothing to offer. */
  emptyText?: string;
};

type Entry = { kind: 'tag'; tag: Tag } | { kind: 'create'; name: string };

function entryId(uid: string, entry: Entry): string {
  return `${uid}-${entry.kind === 'tag' ? entry.tag.id : 'create'}`;
}

/**
 * The inside of a tag popover: a search box over a list of tags. It filters as you type, ignoring
 * accents and case, and takes focus when it appears. With `allowCreate`, a name no tag has shows
 * "Criar "…"", which saves the tag at once and then picks it. A name the server refuses (a clash it
 * saw first) shows as the usual error toast and the list stays. Built like `CategoryPicker`, so
 * keyboard use is the same. `TagCombobox` and `TagMenu` put it in a popover.
 */
export function TagList({ options, onPick, allowCreate = false, known, searchLabel = 'Buscar tag', emptyText = 'Nenhuma tag encontrada' }: Props) {
  const tagsQuery = useTags();
  const everyTag = tagsQuery.data ?? [];
  const offered = options ?? everyTag;
  const existing = known ?? options ?? everyTag;

  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const name = query.trim();
  const folded = foldText(name);
  const matches = offered.filter((tag) => foldText(tag.name).includes(folded));
  const nameTaken = existing.some((tag) => foldText(tag.name) === folded);
  const entries: Entry[] = [
    ...matches.map((tag): Entry => ({ kind: 'tag', tag })),
    ...(allowCreate && name !== '' && !nameTaken ? [{ kind: 'create', name } satisfies Entry] : []),
  ];
  const activeEntry = entries[Math.min(highlight, entries.length - 1)];

  const create = useChange((tagName: string) => createTag(tagName), {
    onSuccess: ({ tag }) => onPick(tag),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activeId = activeEntry ? entryId(uid, activeEntry) : undefined;
  useEffect(() => {
    if (activeId === undefined) return;
    document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  function choose(entry: Entry) {
    if (create.isPending) return;
    if (entry.kind === 'tag') onPick(entry.tag);
    else create.mutate(entry.name);
  }

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setHighlight(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((previous) => (entries.length === 0 ? 0 : (previous + 1) % entries.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((previous) => (entries.length === 0 ? 0 : (previous - 1 + entries.length) % entries.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeEntry) choose(activeEntry);
    }
  }

  return (
    <>
      <div className="p-2 pb-1">
        <Input
          ref={inputRef}
          value={query}
          maxLength={TAG_NAME_MAX_LENGTH}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder={allowCreate ? 'Buscar ou criar tag' : 'Buscar tag'}
          aria-label={searchLabel}
          aria-activedescendant={activeId}
          disabled={create.isPending}
        />
      </div>
      <ul role="listbox" aria-label="Tags" className="min-h-0 flex-1 overflow-y-auto p-1">
        {entries.length === 0 ? <li className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</li> : null}
        {entries.map((entry, index) => (
          <li
            key={entryId(uid, entry)}
            id={entryId(uid, entry)}
            role="option"
            aria-selected={entry === activeEntry}
            className={cn('flex min-h-11 cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm md:min-h-0', entry === activeEntry && 'bg-hover')}
            onMouseEnter={() => setHighlight(index)}
            onClick={() => choose(entry)}
          >
            <span className="truncate">{entry.kind === 'tag' ? entry.tag.name : `Criar "${entry.name}"`}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
