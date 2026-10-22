import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { createCategory, reorderCategories } from '@/api/endpoints';
import { useBucketLabels, useCategories, useChange } from '@/api/queries';
import type { Category, CategoryAppliesTo, CategoryBucket, NewCategory } from '@/api/types';
import { Field } from '@/components/Field';
import { NativeSelect } from '@/components/NativeSelect';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { PageHeader } from '@/components/PageHeader';
import { QueryView } from '@/components/QueryView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { groupCategories, moveCategory } from '@/lib/categories';
import { plural } from '@/lib/format';
import { NAME_MAX_LENGTH } from '../../../shared/limits';
import { CategoryRow } from './categorias/CategoryRow';

export function CategoriasPage() {
  const categories = useCategories();
  const labels = useBucketLabels();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [appliesTo, setAppliesTo] = useState<CategoryAppliesTo>('expense');
  const [bucket, setBucket] = useState<CategoryBucket | ''>('needs');

  const closeForm = () => {
    setAdding(false);
    setName('');
    setAppliesTo('expense');
    setBucket('needs');
  };

  const create = useChange(
    (input: NewCategory) => createCategory(input),
    {
      onSuccess: (result, input) => {
        // Bringing an archived category back can move its old lines to the new group (ADR-0012).
        const moved =
          result.linesChanged === 1
            ? ' 1 lançamento antigo dela mudou para o novo grupo.'
            : result.linesChanged > 1
              ? ` ${result.linesChanged} lançamentos antigos dela mudaram para o novo grupo.`
              : '';
        toast.success(`Categoria "${input.name}" adicionada.${moved}`);
        closeForm();
      },
    },
  );
  const move = useChange((ids: string[]) => reorderCategories({ ids }));

  const header = (loaded: Category[] | undefined) => (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHeader
        eyebrow="Configurações"
        title="Categorias"
        intro='Cada categoria de gasto pertence a um grupo, e é o grupo que alimenta as barras do Orçamento. Uma categoria sem grupo aparece como "Sem grupo".'
      />
      {loaded && !adding ? (
        <Button onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" />
          Adicionar categoria
        </Button>
      ) : null}
    </div>
  );

  return (
    <QueryView query={categories} header={header}>
      {(all) => (
        <>
          {adding ? (
            <SectionCard>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = name.trim();
                  if (!trimmed) return;
                  create.mutate({ name: trimmed, appliesTo, bucket: appliesTo === 'income' ? null : bucket || null });
                }}
              >
                <div className="w-full sm:w-64">
                  <Field label="Nome da nova categoria">
                    <Input autoFocus maxLength={NAME_MAX_LENGTH} value={name} onChange={(event) => setName(event.target.value)} />
                  </Field>
                </div>
                <div className="w-full sm:w-36">
                  <Field label="Serve para">
                    <NativeSelect value={appliesTo} onChange={(event) => setAppliesTo(event.target.value as CategoryAppliesTo)}>
                      <option value="expense">Gasto</option>
                      <option value="income">Entrada</option>
                    </NativeSelect>
                  </Field>
                </div>
                <div className="w-full sm:w-44">
                  <Field label="Grupo">
                    <NativeSelect
                      value={appliesTo === 'income' ? '' : bucket}
                      disabled={appliesTo === 'income'}
                      onChange={(event) => setBucket(event.target.value as CategoryBucket | '')}
                    >
                      <option value="needs">{labels.needs}</option>
                      <option value="wants">{labels.wants}</option>
                      <option value="savings">{labels.savings}</option>
                      <option value="">Sem grupo</option>
                    </NativeSelect>
                  </Field>
                </div>
                <Button type="submit" loading={create.isPending} disabled={name.trim() === ''}>
                  Adicionar
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  Cancelar
                </Button>
                <p className="basis-full text-xs text-muted-foreground">
                  Arquivar não apaga os lançamentos antigos. Criar de novo uma categoria arquivada, com o mesmo nome, traz ela de volta.
                </p>
              </form>
            </SectionCard>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {groupCategories(all, labels).map((group) => (
              <SectionCard key={group.key}>
                <SectionHeader
                  leading={<span aria-hidden="true" className="size-3 rounded-sm" style={{ backgroundColor: group.color }} />}
                  title={group.label}
                  action={<span className="text-xs text-muted-foreground">{plural(group.items.length, 'categoria', 'categorias')}</span>}
                />
                <ul aria-label={`Categorias em ${group.label}`} className="flex flex-col gap-0.5">
                  {group.items.map((item, index) => (
                    <CategoryRow
                      key={item.id}
                      category={item}
                      canMoveUp={index > 0}
                      canMoveDown={index < group.items.length - 1}
                      moving={move.isPending}
                      onMove={(direction) => {
                        const ids = moveCategory(all, item.id, direction);
                        if (ids.length > 0) move.mutate(ids);
                      }}
                    />
                  ))}
                </ul>
              </SectionCard>
            ))}
          </div>
        </>
      )}
    </QueryView>
  );
}
