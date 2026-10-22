import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import type { Account } from '@/api/types';
import { AccountsPicker } from '@/components/AccountsPicker';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Field } from '@/components/Field';
import { NativeSelect } from '@/components/NativeSelect';
import { Segmented } from '@/components/Segmented';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KIND_FILTERS, type KindFilter } from '@/lib/lines';
import { cn } from '@/lib/utils';

/** How long Buscar waits after the last key before it asks the server. */
export const SEARCH_DELAY_MS = 250;

type SearchBoxProps = {
  /** The search text the address holds. */
  value: string;
  onSearch: (text: string) => void;
  inputRef: Ref<HTMLInputElement>;
  /** Changes each time the filters clear. The box then empties and drops any search still waiting to be sent. */
  resetSignal: number;
};

/**
 * Buscar. The text shows at once. The address, and so the request, follows
 * 250 ms after the last key. When the address changes from outside (Limpar
 * filtros, Back), the box shows what the address holds. A new `resetSignal`
 * empties the box at once, even if the last key came less than 250 ms ago.
 */
function SearchBox({ value, onSearch, inputRef, resetSignal }: SearchBoxProps) {
  const [text, setText] = useState(value);
  // What this box last wrote to the address, and the address text it last saw.
  const [sent, setSent] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) {
      setSent(value);
      setText(value);
    }
  }
  const [seenReset, setSeenReset] = useState(resetSignal);
  if (resetSignal !== seenReset) {
    setSeenReset(resetSignal);
    setText('');
    setSent('');
  }

  const latestOnSearch = useRef(onSearch);
  useEffect(() => {
    latestOnSearch.current = onSearch;
  });
  useEffect(() => {
    if (text === sent) return;
    const timer = setTimeout(() => {
      setSent(text);
      latestOnSearch.current(text);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, sent]);

  return (
    <Field label="Buscar">
      <Input ref={inputRef} type="search" placeholder="Apelido ou texto do banco" value={text} onChange={(event) => setText(event.target.value)} />
    </Field>
  );
}

type Props = {
  search: string;
  onSearch: (text: string) => void;
  searchRef: Ref<HTMLInputElement>;
  /** Changes each time the filters clear, so Buscar drops text it has not sent yet. */
  searchReset: number;
  accounts: Account[];
  /** The chosen accounts. Empty means all. */
  accountIds: string[];
  onAccounts: (ids: string[]) => void;
  categoryId: string;
  categoryOptions: { id: string; name: string }[];
  onCategory: (id: string) => void;
  kind: KindFilter;
  onKind: (kind: KindFilter) => void;
  /** The tags to filter by, or left out while there is no tag to offer (none yet, or a server without tags). */
  tagOptions?: { id: string; name: string }[];
  /** The chosen tag id, or '' for any. */
  tagId: string;
  onTag: (id: string) => void;
  /** How many of accounts, category, type and tag are on. The phone button shows it. */
  panelCount: number;
  /** The chips of the filters a link carried. Left out when there are none. */
  chips?: ReactNode;
  /** The "Limpar filtros" button. Left out while no filter is on. */
  clear?: ReactNode;
  /** The "Selecionar" / "Cancelar" button of a touch screen, which has no hover to reveal the checkboxes. Left out with a pointer. */
  selectToggle?: ReactNode;
};

/** Names the "Filtros" button: "Filtros" alone, or "Filtros, 2 ativos". */
function filtersButtonName(count: number): string {
  if (count === 0) return 'Filtros';
  return `Filtros, ${count} ${count === 1 ? 'ativo' : 'ativos'}`;
}

/**
 * Everything above the list: Buscar, Contas, Categoria, Tag, the type control, the add button,
 * the chips from a link and "Limpar filtros". Each control renders once and CSS moves it.
 *
 * Below `md` the bar has Buscar on line one, "Filtros", "Selecionar" (touch screens only) and the add button on line two, then
 * the panel while it is open (Contas, Categoria, Tag, type), then the chips and the clear button.
 * From `md` up the button is gone and the panel is `contents`, so its three controls join the
 * bar's own lines, put in today's order with `order`: Buscar, Conta, Categoria and the add
 * button ("Selecionar" just before it); the chips; the type control and the clear button. The empty `after` block breaks
 * the line before the type control. With the bar's 12 px gap on each side it leaves the
 * 24 px that separated the rows before.
 */
export function LinesFilters({
  search, onSearch, searchRef, searchReset, accounts, accountIds, onAccounts, categoryId, categoryOptions, onCategory,
  kind, onKind, tagOptions, tagId, onTag, panelCount, chips, clear, selectToggle,
}: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div
      role="group"
      aria-label="Filtros e busca"
      className="flex flex-wrap items-end gap-3 md:after:order-3 md:after:h-0 md:after:basis-full"
    >
      <div className="w-full md:w-64">
        <SearchBox value={search} onSearch={onSearch} inputRef={searchRef} resetSignal={searchReset} />
      </div>
      <Button
        variant="outline"
        className="md:hidden"
        aria-label={filtersButtonName(panelCount)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {panelCount > 0 ? `Filtros · ${panelCount}` : 'Filtros'}
      </Button>
      {selectToggle ? <div className="md:order-1">{selectToggle}</div> : null}
      <div
        id={panelId}
        role="region"
        aria-label="Filtros"
        className={cn('basis-full flex-wrap items-end gap-3 md:contents', open ? 'flex' : 'hidden')}
      >
        <div className="w-full sm:w-48">
          <Field label="Filtrar por conta">
            <AccountsPicker label="Filtrar por conta" accounts={accounts} value={accountIds} onChange={onAccounts} />
          </Field>
        </div>
        <div className="w-full sm:w-52">
          <Field label="Filtrar por categoria">
            <CategoryPicker label="Filtrar por categoria" value={categoryId} options={categoryOptions} onChange={onCategory} />
          </Field>
        </div>
        {tagOptions ? (
          <div className="w-full sm:w-44">
            <Field label="Filtrar por tag">
              <NativeSelect value={tagId} onChange={(event) => onTag(event.target.value)}>
                <option value="">Todas as tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        ) : null}
        <Segmented label="Filtrar por tipo" value={kind} options={KIND_FILTERS} onChange={onKind} className="md:order-4 md:self-center" />
      </div>
      {chips ? <div className="basis-full md:order-2 md:mt-3">{chips}</div> : null}
      {clear ? <div className="ml-auto flex md:order-5 md:self-center">{clear}</div> : null}
    </div>
  );
}
