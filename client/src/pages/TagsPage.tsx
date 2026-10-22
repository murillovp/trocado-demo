import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAnalysisTags, useTags } from '@/api/queries';
import { QueryView } from '@/components/QueryView';
import { SectionCard } from '@/components/SectionCard';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { NewTagForm } from './tags/NewTagForm';
import { TagDetail } from './tags/TagDetail';
import { TagRow } from './tags/TagRow';

/** The address parameter that names the tag whose detail is open. Transações uses the same name. */
const TAG_PARAM = 'tag';

/**
 * Configurações › Tags: every tag with its spending, dates and line count for Casa. Tags belong to the
 * household (ADR-0004), so the page has no person switch and no month: it asks the server for Casa
 * (no `personId`) whatever person the address names.
 * Selecting a row opens its detail beside the list (above it on a phone) and writes the tag to the
 * address (`tag`), so a link can open it; selecting it again closes it. "Nova tag" adds one; each row renames or deletes its own.
 */
export function TagsPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get(TAG_PARAM) ?? '';
  const [adding, setAdding] = useState(false);

  const list = useAnalysisTags({});
  const detail = useAnalysisTags({ tagId: selectedId }, { enabled: selectedId !== '' });
  // Deleting takes a tag off every line, spending or not, so the question counts all of them.
  const householdTags = useTags().data;

  function select(tagId: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (tagId === '') next.delete(TAG_PARAM);
        else next.set(TAG_PARAM, tagId);
        return next;
      },
      { replace: true },
    );
  }

  const header = (loaded: unknown) => (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHeader eyebrow="Configurações" title="Tags" intro="Gasto de todos os meses, por tag." />
      {loaded && !adding ? (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" />
          Nova tag
        </Button>
      ) : null}
    </div>
  );

  return (
    <QueryView query={list} header={header} loading={<ListSkeleton />}>
      {({ tags }) => (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SectionCard>
            {adding ? <NewTagForm onDone={() => setAdding(false)} /> : null}
            {tags.length === 0 ? (
              <EmptyState compact>Nenhuma tag ainda. Crie uma com "Nova tag" ou ponha uma em lançamentos na tela Transações.</EmptyState>
            ) : (
              <ul aria-label="Tags" className="flex flex-col gap-0.5">
                {tags.map((tag) => (
                  <TagRow
                    key={tag.tagId}
                    tag={tag}
                    selected={tag.tagId === selectedId}
                    onSelect={() => select(tag.tagId === selectedId ? '' : tag.tagId)}
                    onDeleted={() => {
                      if (tag.tagId === selectedId) select('');
                    }}
                    householdLineCount={householdTags?.find((item) => item.id === tag.tagId)?.lineCount ?? tag.lineCount}
                  />
                ))}
              </ul>
            )}
          </SectionCard>
          {selectedId === '' ? null : (
            <div className="order-first flex flex-col gap-3 lg:order-none">
              <SelectedDetail query={detail} onClose={() => select('')} />
            </div>
          )}
        </div>
      )}
    </QueryView>
  );
}

function SelectedDetail({ query, onClose }: { query: ReturnType<typeof useAnalysisTags>; onClose: () => void }) {
  if (query.isError && query.data === undefined) {
    return <ErrorState inline error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (query.data === undefined) return <ListSkeleton rows={3} />;
  if (query.data.detail === null) {
    return (
      <SectionCard>
        <p className="text-sm">Essa tag não existe mais.</p>
        <div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </SectionCard>
    );
  }
  return <TagDetail detail={query.data.detail} />;
}
