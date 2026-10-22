import { useRef, useState } from 'react';
import { useAccounts, useBucketLabels, useCategories, useTags, useTransactions } from '@/api/queries';
import type { Category, LedgerLine, LedgerQuery, LedgerSummary, Person } from '@/api/types';
import { SubjectGate } from '@/app/SubjectGate';
import { subjectPersonId, useView, type Subject } from '@/app/view';
import { ClearFiltersButton } from '@/components/ClearFiltersButton';
import { FilterChip } from '@/components/FilterChip';
import { Money } from '@/components/Money';
import { QueryView } from '@/components/QueryView';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States';
import { SubjectHeader } from '@/components/SubjectHeader';
import { TextLink } from '@/components/TextLink';
import { Button } from '@/components/ui/button';
import { LineDataList } from '@/components/LineDataList';
import { SelectShowProvider } from '@/components/SelectCell';
import { accountParams } from '@/lib/accountParams';
import { personColor } from '@/lib/colors';
import { formatDayLong, monthSentence, plural } from '@/lib/format';
import { shownSelectionState, useLineSelection } from '@/lib/useLineSelection';
import { useSelectionMode, type SelectShow } from '@/lib/useSelectionMode';
import { useOpenRow, type UnsavedGuard } from '@/lib/useOpenRow';
import { cn } from '@/lib/utils';
import { bucketFilterLabel, countActiveFilters, countPanelFilters, type BucketFilter } from '@/lib/transacoesLink';
import { AddLineDialog } from './transacoes/AddLineDialog';
import { LinesFilters } from './transacoes/LinesFilters';
import { BatchBar } from './transacoes/BatchBar';
import { LineRow } from './transacoes/LineRow';
import { useTransacoesFilters } from './transacoes/useTransacoesFilters';

const PAGE_SIZE = 100;

export function TransacoesPage() {
  return (
    <SubjectGate allowHousehold>
      {(subject, people) => <LinesScreen subject={subject} people={people} />}
    </SubjectGate>
  );
}

function LinesScreen({ subject, people }: { subject: Subject; people: Person[] }) {
  const { month } = useView();
  const filters = useTransacoesFilters();
  const { search, accountIds, categoryId, kind, bucket, savingsLabel, tagId, date, allMonths } = filters.values;
  const { openId, toggle, close, guard } = useOpenRow();
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchReset, setSearchReset] = useState(0);

  const accountsQuery = useAccounts();
  const tagsQuery = useTags();
  const labels = useBucketLabels();
  const categoriesQuery = useCategories();
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const personId = subjectPersonId(subject);
  const scopedAccounts = personId ? accounts.filter((account) => account.personId === personId) : accounts;
  // An account of the other person, kept in the address, is forgotten when the person changes.
  const chosenAccounts = accountIds.filter((id) => scopedAccounts.some((account) => account.id === id));
  const isKnownCategory = categoryId === '' || categoryId === 'none' || categories.some((category) => category.id === categoryId);
  const categoryOptions = [
    { id: '', name: 'Todas as categorias' },
    { id: 'none', name: 'Sem categoria' },
    ...categories,
    ...(categoriesQuery.data !== undefined && !isKnownCategory ? [{ id: categoryId, name: 'Categoria arquivada' }] : []),
  ];

  // The tag control shows once tags exist (or one is in the address). A server without tags fails the query and hides it.
  const tags = tagsQuery.data;
  const tagOptions =
    tags !== undefined && (tags.length > 0 || tagId !== '')
      ? [...tags, ...(tagId !== '' && !tags.some((tag) => tag.id === tagId) ? [{ id: tagId, name: 'Tag apagada' }] : [])]
      : undefined;

  const activeFilters = countActiveFilters({ search, accountIds: chosenAccounts, categoryId, kind, bucket, savingsLabel, tagId, date, allMonths });

  // Resets the six filters only. Month and person stay in the address.
  // The clear button disappears, so focus moves to Buscar before it does.
  function clearFilters() {
    searchRef.current?.focus();
    setSearchReset((count) => count + 1);
    filters.clear();
  }

  // One day replaces the month for the list, so the month picker is hidden then, as for `meses=todos`. `meses=todos` lifts the month limit: the server lists every month when it gets none.
  const query: LedgerQuery = {
    month: date === '' && !allMonths ? month : undefined,
    date: date === '' ? undefined : date,
    personId,
    ...accountParams(chosenAccounts),
    tagId: tagId || undefined,
    categoryId: categoryId || undefined,
    kind: kind || undefined,
    bucket,
    savingsLabel,
    search: search.trim() || undefined,
  };
  const lines = useTransactions(query);

  // The selection lives here, beside the filters, because "Selecionar" and "Cancelar" (touch screens) sit among them.
  // It starts over when the query changes: a filter, the month or the person.
  const queryKey = JSON.stringify(query);
  const rows = lines.data?.transactions ?? [];
  const selection = useLineSelection(
    queryKey,
    rows.map((line) => line.id),
  );
  const selectMode = useSelectionMode(selection.ids.length, selection.clear);

  return (
    <>
      <SubjectHeader subject={subject} people={people} allowHousehold showMonth={!allMonths && date === ''} />
      <nav aria-label="Páginas de Transações" className="flex gap-4 text-sm md:hidden">
        <TextLink to="/transacoes/importar">Importar</TextLink>
        <TextLink to="/transacoes/parcelas">Parcelas</TextLink>
      </nav>

      <LinesFilters
        search={search}
        onSearch={filters.setSearch}
        searchRef={searchRef}
        searchReset={searchReset}
        accounts={scopedAccounts}
        accountIds={chosenAccounts}
        onAccounts={filters.setAccountIds}
        categoryId={categoryId}
        categoryOptions={categoryOptions}
        onCategory={filters.setCategoryId}
        kind={kind}
        onKind={filters.setKind}
        tagOptions={tagOptions}
        tagId={tagId}
        onTag={filters.setTagId}
        panelCount={countPanelFilters({ accountIds: chosenAccounts, categoryId, kind, tagId })}
        chips={
          bucket !== undefined || savingsLabel !== undefined || date !== '' || allMonths ? (
            <div role="group" aria-label="Filtros vindos de um link" className="flex flex-wrap gap-1.5">
              {bucket !== undefined ? (
                <FilterChip
                  removeLabel={`Tirar filtro Grupo: ${bucketFilterLabel(bucket, labels)}`}
                  onRemove={filters.removeBucket}
                >
                  Grupo: {bucketFilterLabel(bucket, labels)}
                </FilterChip>
              ) : null}
              {savingsLabel !== undefined ? (
                <FilterChip
                  removeLabel={`Tirar filtro Rótulo: ${savingsLabel === '' ? 'sem rótulo' : savingsLabel}`}
                  onRemove={filters.removeSavingsLabel}
                >
                  Rótulo: {savingsLabel === '' ? 'sem rótulo' : savingsLabel}
                </FilterChip>
              ) : null}
              {date !== '' ? (
                <FilterChip removeLabel={`Tirar filtro Dia: ${formatDayLong(date)}`} onRemove={filters.removeDate}>
                  Dia: {formatDayLong(date)}
                </FilterChip>
              ) : null}
              {allMonths ? (
                <FilterChip removeLabel="Tirar filtro Meses: todos" onRemove={filters.removeAllMonths}>
                  Meses: todos
                </FilterChip>
              ) : null}
            </div>
          ) : undefined
        }
        clear={activeFilters > 0 ? <ClearFiltersButton count={activeFilters} onClear={clearFilters} /> : undefined}
        onAdd={() => setAdding(true)}
        selectToggle={
          selectMode.touch && rows.length > 0 ? (
            <Button variant="outline" onClick={selectMode.toggle}>
              {selectMode.picking ? 'Cancelar' : 'Selecionar'}
            </Button>
          ) : undefined
        }
      />

      {accountsQuery.isError ? <ErrorState inline error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} /> : null}
      {categoriesQuery.isError ? <ErrorState inline error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} /> : null}

      <QueryView query={lines} loading={<ListSkeleton />}>
        {({ transactions, summary }) =>
          transactions.length === 0 ? (
            <EmptyState>
              {activeFilters > 0 ? (
                <>
                  Nenhum lançamento com esses filtros.
                  <div className="mt-2">
                    <ClearFiltersButton count={activeFilters} onClear={clearFilters} />
                  </div>
                </>
              ) : (
                <>
                  Nenhum lançamento em {monthSentence(month)}. <TextLink to="/transacoes/importar">Importar um extrato</TextLink>
                </>
              )}
            </EmptyState>
          ) : (
            <LineList
              queryKey={queryKey}
              lines={transactions}
              selection={selection}
              selectShow={selectMode.show}
              summary={summary}
              categories={categories}
              openId={openId}
              onToggle={toggle}
              onClose={close}
              guard={guard}
              bucket={bucket}
              subject={subject}
              people={people}
            />
          )
        }
      </QueryView>
      {adding ? (
        <AddLineDialog open onOpenChange={setAdding} people={people} defaultPersonId={personId} month={month} />
      ) : null}
    </>
  );
}

type ListProps = {
  /** Names the query the lines answer. "Mostrar mais" starts over when it changes. */
  queryKey: string;
  lines: LedgerLine[];
  /** Which lines are ticked, and how to tick or clear them. The page owns it, so "Cancelar" in the filters can clear it. */
  selection: ReturnType<typeof useLineSelection>;
  /** When the checkboxes show: on hover, always, or not at all. */
  selectShow: SelectShow;
  /** The totals of all the lines, as the server counted them. */
  summary: LedgerSummary;
  categories: Category[];
  openId: string | null;
  onToggle: (id: string) => void;
  onClose: (id: string) => void;
  guard: UnsavedGuard;
  bucket: BucketFilter | undefined;
  subject: Subject;
  people: Person[];
};

function LineList({ queryKey, lines, selection, selectShow, summary, categories, openId, onToggle, onClose, guard, bucket, subject, people }: ListProps) {
  const selectedLines = lines.filter((line) => selection.isSelected(line.id));
  // The count belongs to the query it was raised on. The rows stay mounted when the query changes,
  // so an open editor keeps what was typed in it; only the count starts over.
  const [more, setMore] = useState({ queryKey, shown: PAGE_SIZE });
  const visible = more.queryKey === queryKey ? more.shown : PAGE_SIZE;
  const rest = lines.length - visible;
  // The header box covers the lines on screen, not the ones "Mostrar mais" has yet to add.
  const shownIds = lines.slice(0, visible).map((line) => line.id);
  const headerSelection = {
    checked: shownSelectionState(shownIds, selection.isSelected),
    onChange: (checked: boolean) => selection.setMany(shownIds, checked),
  };
  // Casa mixes everyone's lines, so each row carries its owner's dot. A person's screen needs none.
  const ownerOf = (line: LedgerLine) => {
    const owner = subject.kind === 'casa' ? people.find((person) => person.id === line.personId) : undefined;
    return owner ? { name: owner.name, color: personColor(owner) } : undefined;
  };
  return (
    <>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{plural(lines.length, 'lançamento', 'lançamentos')}</span>
        {bucket !== undefined ? (
          <span>Total <Money cents={summary.pileTotalCents} tone="plain" align="start" className="text-foreground" /></span>
        ) : null}
        <span>Gastos <Money cents={summary.spendingCents} kind="expense" align="start" className="text-foreground" /></span>
        <span>Entradas <Money cents={summary.incomeCents} kind="income" align="start" className="text-foreground" /></span>
        <span>Poupança <Money cents={summary.savingsCents} kind="savings" align="start" className="text-foreground" /></span>
        {summary.transferCount > 0 ? (
          <span>{plural(summary.transferCount, 'lançamento', 'lançamentos')} fora dos totais</span>
        ) : null}
      </p>
      {selectedLines.length > 0 ? <BatchBar lines={selectedLines} categories={categories} onClear={selection.clear} /> : null}
      {/* Below md the batch bar is fixed above the bottom tabs, so the end of the list gets room under it. */}
      <div data-testid="line-list" className={cn('flex flex-col gap-6', selectedLines.length > 0 && 'pb-40 md:pb-0')}>
        <SelectShowProvider value={selectShow}>
          <LineDataList label="Lançamentos" variant="ledger" selectable headerSelection={headerSelection}>
            {lines.slice(0, visible).map((line) => (
              <LineRow
                key={line.id}
                line={line}
                categories={categories}
                open={openId === line.id}
                onToggle={() => onToggle(line.id)}
                onClose={() => onClose(line.id)}
                guard={guard}
                owner={ownerOf(line)}
                selection={{ checked: selection.isSelected(line.id), onChange: (checked) => selection.set(line.id, checked) }}
              />
            ))}
          </LineDataList>
        </SelectShowProvider>
        {rest > 0 ? (
          <Button variant="outline" className="self-center" onClick={() => setMore({ queryKey, shown: visible + PAGE_SIZE })}>
            Mostrar mais {Math.min(rest, PAGE_SIZE)}
          </Button>
        ) : null}
      </div>
    </>
  );
}
