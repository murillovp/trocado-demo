import { Pencil, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useBucketLabels } from '@/api/queries';
import type { BudgetView, Person } from '@/api/types';
import { IconButton } from '@/components/IconButton';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { TextLink } from '@/components/TextLink';
import { incomeSentence } from '@/lib/budget';
import { TargetsForm } from '../pessoas/TargetsForm';
import { BucketNamesForm } from './BucketNamesForm';

type OpenForm = 'targets' | 'names' | null;

/**
 * What the screen is about, in two sentences, with the two icon buttons that adjust it in place:
 * the person's targets and reference income, and the group names. The open form sits on its own
 * line under the sentences. Only one is open at a time; its icon or its Cancelar closes it.
 */
export function IntroBlock({ person, view }: { person: Person; view: BudgetView }) {
  const labels = useBucketLabels();
  const [open, setOpen] = useState<OpenForm>(null);
  const toggle = (form: Exclude<OpenForm, null>) => setOpen(open === form ? null : form);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>
            Divide as entradas de {person.name} em três grupos: {labels.needs}, {labels.wants} e {labels.savings}. Cada categoria pertence
            a um grupo em <TextLink to="/configuracoes/categorias">Categorias</TextLink>.
          </p>
          <p>{incomeSentence(view)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton label="Ajustar metas e renda de referência" aria-expanded={open === 'targets'} onClick={() => toggle('targets')}>
            <SlidersHorizontal aria-hidden="true" />
          </IconButton>
          <IconButton label="Renomear grupos" aria-expanded={open === 'names'} onClick={() => toggle('names')}>
            <Pencil aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      {open === 'targets' ? (
        <SectionCard>
          <SectionHeader title={`Metas de ${person.name}`} description="Valem para o 50/30/20 de todos os meses." />
          <TargetsForm person={person} onSaved={() => setOpen(null)} onCancel={() => setOpen(null)} />
        </SectionCard>
      ) : null}
      {open === 'names' ? <BucketNamesForm onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
