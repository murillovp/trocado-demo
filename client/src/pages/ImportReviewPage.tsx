import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { cancelImport, confirmImport } from '@/api/endpoints';
import { keys, useAccounts, useCategories, useChange, useImportReview, useTags } from '@/api/queries';
import type { Category, ImportReview, LineEdit, ReviewLine, Tag } from '@/api/types';
import { useTransacoesLink, useViewPath } from '@/app/view';
import { LineDataList } from '@/components/LineDataList';
import { Notice } from '@/components/Notice';
import { PageHeader } from '@/components/PageHeader';
import { QueryView } from '@/components/QueryView';
import { SelectShowProvider } from '@/components/SelectCell';
import { SelectionBar } from '@/components/SelectionBar';
import { ErrorState, PageSkeleton } from '@/components/States';
import { TagMenu } from '@/components/TagMenu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiFailureNotice } from '@/lib/aiErrors';
import { formatDate, plural } from '@/lib/format';
import { FORMAT_LABEL, rowsSentence } from '@/lib/labels';
import { newestFirst } from '@/lib/lines';
import { bulkTagMessage, type TagAction } from '@/lib/tags';
import { shownSelectionState, useLineSelection } from '@/lib/useLineSelection';
import { useSelectionMode } from '@/lib/useSelectionMode';
import { monthOf } from '../../../shared/dates';
import { ConfirmBar, ConfirmHelp } from './importar/ConfirmBar';
import { FileRows } from './importar/FileRows';
import { ReviewFilters, type ReviewFilter } from './importar/ReviewFilters';
import { ReviewLineRow } from './importar/ReviewLineRow';
import { ScreenshotSection } from './importar/ScreenshotSection';
import { countTagChanges, tagsOnLines } from './importar/reviewTags';
import { clearSavedDrafts } from './importar/savedDrafts';
import { aiFailureFromState } from './importar/reviewState';
import { useReviewDrafts } from './importar/useReviewDrafts';

/** One empty list for every render before the categories arrive, so a row's props do not change. */
const NO_CATEGORIES: Category[] = [];

export function ImportReviewPage() {
  const { id = '' } = useParams();
  const review = useImportReview(id);
  // No header before the data arrives: the title is the account's name, which the review has to say.
  return (
    <QueryView query={review} className="contents">
      {(data) => <ReviewScreen id={id} data={data} />}
    </QueryView>
  );
}

/**
 * Waits for the categories and the tags before it shows the lines, because saved corrections are checked
 * against them when the screen opens. If they fail to load, the screen opens without that check;
 * a server that does not know tags (the tags failed) shows no tag controls.
 */
function ReviewScreen({ id, data }: { id: string; data: ImportReview }) {
  const categoriesQuery = useCategories();
  const tagsQuery = useTags();
  if (categoriesQuery.isPending || tagsQuery.isPending) return <PageSkeleton />;
  return <ReviewContent id={id} data={data} categoriesQuery={categoriesQuery} tags={tagsQuery.data} />;
}

/** Shown in place of the filters and the list when every row of the file was already imported: nothing to review or confirm. */
function NothingNew({ total, onShowFile }: { total: number; onShowFile: () => void }) {
  return (
    <Notice className="items-start">
      <p>Todas as {total} linhas deste arquivo já estavam no Trocado. Não há nada novo para confirmar.</p>
      <Button variant="link" className="h-auto p-0 underline" onClick={onShowFile}>
        Ver tudo que o arquivo tinha
      </Button>
    </Notice>
  );
}

function ReviewContent({ id, data, categoriesQuery, tags }: { id: string; data: ImportReview; categoriesQuery: ReturnType<typeof useCategories>; tags: Tag[] | undefined }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const linkToTransacoes = useTransacoesLink();
  const viewPath = useViewPath();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? NO_CATEGORIES;
  const editable = data.import.status === 'pending';
  // A copy left by an import that was confirmed or discarded elsewhere is never used again.
  useEffect(() => {
    if (!editable) clearSavedDrafts(id);
  }, [editable, id]);
  const { drafts, setDraft, setTags, tagLines, setSpread, spread, draftFor, waiting, edits, restoredAt } = useReviewDrafts(
    data.lines,
    categories,
    editable ? id : null,
    tags,
  );
  // `tags` is undefined when the server does not know tags: then there is no tag field and no checkbox.
  const tagsEnabled = tags !== undefined;
  const [filter, setFilter] = useState<ReviewFilter | null>(null);
  const [tab, setTab] = useState('lines');
  const nothingNew = editable && data.lines.length === 0;

  // The upload hands over why the AI gave no suggestions. It is read once and then dropped from the
  // address, so a reload shows the lines (still "sem categoria") without the notice.
  const location = useLocation();
  const [aiFailure] = useState(() => aiFailureFromState(location.state));
  useEffect(() => {
    if (location.state !== null) navigate(location, { replace: true, state: null });
  }, [location, navigate]);

  // The confirm bar sits above the bottom tabs, so an item scrolled into view needs more room (index.css).
  useEffect(() => {
    document.documentElement.classList.add('review-screen');
    return () => document.documentElement.classList.remove('review-screen');
  }, []);

  const account = accounts.find((candidate) => candidate.id === data.import.accountId);
  const thisImportLineIds = new Set(data.lines.map((line) => line.id));

  // The "to review" list is fixed at load, so a line does not vanish while it is being fixed.
  const lines = newestFirst(data.lines);
  const flagged = lines.filter((line) => line.flags.length > 0);
  const active: ReviewFilter = filter ?? (editable && flagged.length > 0 ? 'review' : 'all');
  const shown =
    active === 'review' ? flagged : active === 'transfers' ? lines.filter((line) => draftFor(line).kind === 'transfer') : lines;

  // The selection starts over when the filter tab changes, as it does on Transações.
  const selection = useLineSelection(
    active,
    shown.map((line) => line.id),
  );
  const selectable = editable && tagsEnabled;
  const selectMode = useSelectionMode(selection.ids.length, selection.clear);
  const selectedIds = selectable ? new Set(selection.ids) : undefined;
  /** The header box of a list of lines: it covers the lines that list shows, and unticking it unticks only those. */
  const headerSelection = (listed: ReviewLine[]) => {
    const listedIds = listed.map((line) => line.id);
    return {
      checked: shownSelectionState(listedIds, selection.isSelected),
      onChange: (checked: boolean) => selection.setMany(listedIds, checked),
    };
  };
  /** Changes the drafts of the ticked lines. Nothing goes to the server until Confirmar. */
  const tagSelected = (tag: Tag, action: TagAction) => {
    const changed = countTagChanges(drafts, selection.ids, tag, action);
    tagLines(selection.ids, tag, action);
    toast.success(bulkTagMessage(action, tag.name, changed));
    selection.clear();
  };

  const confirm = useChange((payload: LineEdit[]) => confirmImport(id, payload), {
    onSuccess: () => {
      clearSavedDrafts(id);
      // Lines still without a kind after the user's edits, which is what the person has left to do.
      const withoutKind = lines.filter((line) => draftFor(line).kind === null).length;
      const arrived = plural(data.lines.length, 'lançamento', 'lançamentos');
      toast.success(
        `Importação confirmada: ${account ? `${arrived} de ${account.label}` : arrived}${withoutKind > 0 ? `, ${withoutKind} ainda sem tipo` : ''}.`,
      );
      // Opens on the account's owner and the account, in the month the import ends in, so its lines are the first thing in the list.
      const month = data.import.periodEnd ? monthOf(data.import.periodEnd) : undefined;
      const filters = account ? { accountIds: [account.id] } : {};
      navigate(linkToTransacoes(filters, { month, scope: account?.personId }), { replace: true });
    },
  });
  const cancel = useChange(
    async () => {
      await cancelImport(id);
      // Gone before the refetch that follows a change, which would otherwise ask for an import that no longer exists.
      queryClient.removeQueries({ queryKey: keys.importReview(id) });
    },
    {
      onSuccess: () => {
        clearSavedDrafts(id);
        toast.success('Importação descartada. Nada foi salvo.');
        navigate(viewPath('/transacoes/importar'), { replace: true });
      },
    },
  );

  const period =
    data.import.periodStart && data.import.periodEnd
      ? ` · ${formatDate(data.import.periodStart)} a ${formatDate(data.import.periodEnd)}`
      : '';

  return (
    <>
      <PageHeader
        eyebrow="Importar"
        title={account?.label ?? 'Importação'}
        intro={`${data.import.fileName} · ${FORMAT_LABEL[data.import.format]}${period}`}
      />

      {accountsQuery.isError ? <ErrorState inline error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} /> : null}
      {categoriesQuery.isError ? <ErrorState inline error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} /> : null}

      {editable && restoredAt ? <Notice role="status">Recuperamos suas correções de {restoredAt}.</Notice> : null}

      {aiFailure ? (
        <Notice tone="attention" role="status">
          <p>
            <AiFailureNotice failure={aiFailure} lead="A IA não sugeriu categorias neste arquivo." />
          </p>
        </Notice>
      ) : null}

      <Notice className="gap-1">
        <span className="font-medium">{rowsSentence(data.counts)}</span>
        <span className="text-muted-foreground">
          As repetidas já estavam no Trocado e ficam de fora. A outra aba mostra cada linha do arquivo.
        </span>
      </Notice>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="lines" aria-label={`Lançamentos novos · ${data.lines.length}`}>
            <span className="sm:hidden">Novos · {data.lines.length}</span>
            <span className="hidden sm:inline">Lançamentos novos · {data.lines.length}</span>
          </TabsTrigger>
          <TabsTrigger value="rows" aria-label={`Tudo que o arquivo tinha · ${data.counts.total}`}>
            <span className="sm:hidden">Arquivo · {data.counts.total}</span>
            <span className="hidden sm:inline">Tudo que o arquivo tinha · {data.counts.total}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="flex flex-col gap-3">
          <SelectShowProvider value={selectMode.show}>
            {nothingNew ? (
              <NothingNew total={data.counts.total} onShowFile={() => setTab('rows')} />
            ) : (
              <ReviewFilters
                active={active}
                flaggedCount={flagged.length}
                lineCount={data.lines.length}
                onChange={setFilter}
                selectToggle={
                  selectable && selectMode.touch && shown.length > 0 ? (
                    <Button variant="outline" onClick={selectMode.toggle}>
                      {selectMode.picking ? 'Cancelar' : 'Selecionar'}
                    </Button>
                  ) : undefined
                }
              />
            )}
            {selectable && selection.ids.length > 0 ? (
              // The review has its own bar at the bottom of a phone, so this one keeps the top there: tag actions only.
              <SelectionBar count={selection.ids.length} phonePlacement="top" onClear={selection.clear}>
                <TagMenu
                  removeOptions={tagsOnLines(drafts, selection.ids)}
                  onAdd={(tag) => tagSelected(tag, 'add')}
                  onRemove={(tag) => tagSelected(tag, 'remove')}
                />
              </SelectionBar>
            ) : null}
            {data.images.length > 0 ? (
              <div className="flex flex-col gap-3">
                {data.images.map((image) => (
                  <ScreenshotSection
                    key={image.position}
                    importId={id}
                    image={image}
                    allLines={data.lines}
                    allRows={data.rows}
                    shownLines={shown}
                    thisImportLineIds={thisImportLineIds}
                    categories={categories}
                    editable={editable}
                    drafts={drafts}
                    onChange={setDraft}
                    spread={spread}
                    onSpread={setSpread}
                    tagsEnabled={tagsEnabled}
                    onTags={setTags}
                    selectedIds={selectedIds}
                    onSelect={selection.set}
                    headerSelection={headerSelection}
                  />
                ))}
              </div>
            ) : nothingNew ? null : (
              <LineDataList label="Lançamentos novos" variant="review" selectable={selectable} headerSelection={headerSelection(shown)}>
                {shown.map((line) => (
                  <ReviewLineRow
                    key={line.id}
                    line={line}
                    draft={drafts[line.id]}
                    categories={categories}
                    editable={editable}
                    onChange={setDraft}
                    spread={spread?.lineId === line.id ? spread : undefined}
                    onSpread={setSpread}
                    tagsEnabled={tagsEnabled}
                    onTags={setTags}
                    selected={selectedIds?.has(line.id)}
                    onSelect={selection.set}
                  />
                ))}
              </LineDataList>
            )}
          </SelectShowProvider>
        </TabsContent>

        <TabsContent value="rows">
          <FileRows rows={data.rows} importId={id} />
        </TabsContent>
      </Tabs>

      {editable && data.lines.length > 0 ? <ConfirmHelp waiting={waiting} /> : null}

      {editable ? (
        <ConfirmBar
          lineCount={data.lines.length}
          waiting={waiting}
          confirming={confirm.isPending}
          cancelling={cancel.isPending}
          onConfirm={() => confirm.mutate(edits)}
          onCancel={() => cancel.mutate(undefined)}
        />
      ) : (
        <Notice>
          <p>Esta importação já foi confirmada. Os lançamentos estão em Transações.</p>
        </Notice>
      )}
    </>
  );
}
