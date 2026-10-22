import { SlidersHorizontal } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { Account, BucketLabels } from '@/api/types';
import { AccountsPicker } from '@/components/AccountsPicker';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Field } from '@/components/Field';
import { NativeSelect } from '@/components/NativeSelect';
import { Button } from '@/components/ui/button';
import { bucketFilterLabel, type BucketFilter } from '@/lib/transacoesLink';
import { cn } from '@/lib/utils';
import { ANALISE_BUCKETS } from './useAnaliseFilters';

type Props = {
  /** The accounts of the person on screen (all of them for Casa). */
  accounts: Account[];
  /** The chosen accounts. Empty means all. */
  accountIds: string[];
  onAccounts: (ids: string[]) => void;
  bucket: BucketFilter | undefined;
  bucketLabels: BucketLabels;
  onBucket: (bucket: BucketFilter | undefined) => void;
  categoryId: string;
  categoryOptions: { id: string; name: string }[];
  onCategory: (id: string) => void;
  /** The tags to filter by, or left out while there is none to offer (none yet, or a server without tags). */
  tagOptions?: { id: string; name: string }[];
  tagId: string;
  onTag: (id: string) => void;
  /** How many filters are on. The phone button shows it. */
  activeCount: number;
  /** The "Limpar filtros" button. Left out while no filter is on. */
  clear?: ReactNode;
};

/** Names the "Filtros" button: "Filtros" alone, or "Filtros, 2 ativos". */
function filtersButtonName(count: number): string {
  if (count === 0) return 'Filtros';
  return `Filtros, ${count} ${count === 1 ? 'ativo' : 'ativos'}`;
}

/**
 * The filter bar under the header: Contas, Grupo, Categoria, Tag and "Limpar filtros". Each control
 * renders once. Below `md` they sit in a panel behind the "Filtros" button, as on Transações;
 * from `md` up the button is gone and the panel is `contents`, so the controls join the bar's own line.
 */
export function AnaliseFilters({
  accounts, accountIds, onAccounts, bucket, bucketLabels, onBucket, categoryId, categoryOptions, onCategory,
  tagOptions, tagId, onTag, activeCount, clear,
}: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div role="group" aria-label="Filtros da análise" className="flex flex-wrap items-end gap-3">
      <Button
        variant="outline"
        className="md:hidden"
        aria-label={filtersButtonName(activeCount)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {activeCount > 0 ? `Filtros · ${activeCount}` : 'Filtros'}
      </Button>
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
        <div className="w-full sm:w-44">
          <Field label="Filtrar por grupo">
            <NativeSelect
              value={bucket ?? ''}
              onChange={(event) => onBucket(event.target.value === '' ? undefined : (event.target.value as BucketFilter))}
            >
              <option value="">Todos os grupos</option>
              {ANALISE_BUCKETS.map((name) => (
                <option key={name} value={name}>{bucketFilterLabel(name, bucketLabels)}</option>
              ))}
            </NativeSelect>
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
      </div>
      {clear ? <div className="ml-auto flex md:self-center">{clear}</div> : null}
    </div>
  );
}
