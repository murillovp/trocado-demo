import { useState } from 'react';
import { useBudget } from '@/api/queries';
import type { Person } from '@/api/types';
import { SubjectGate } from '@/app/SubjectGate';
import { useView, type Subject } from '@/app/view';
import { QueryView } from '@/components/QueryView';
import { PageSkeleton } from '@/components/States';
import { SubjectHeader } from '@/components/SubjectHeader';
import { BucketCard } from './orcamento/BucketCard';
import { Drilldown, type Pile } from './orcamento/Drilldown';
import { IntroBlock } from './orcamento/IntroBlock';
import { SplitStrip } from './orcamento/SplitStrip';

/** 50/30/20 measures one person against their own income, so there is no Casa (spec 4a). */
export function OrcamentoPage() {
  return (
    <SubjectGate allowHousehold={false}>
      {(subject, people) =>
        subject.kind === 'person' ? <BudgetScreen subject={subject} person={subject.person} people={people} /> : null
      }
    </SubjectGate>
  );
}

function BudgetScreen({ subject, person, people }: { subject: Subject; person: Person; people: Person[] }) {
  const { month } = useView();
  const budget = useBudget(month, person.id);
  const [pile, setPile] = useState<Pile>('needs');

  return (
    <QueryView query={budget} loading={<PageSkeleton />} header={<SubjectHeader subject={subject} people={people} allowHousehold={false} />}>
      {(data) => (
        <>
          {/* Keyed by person, so a form left open (and its draft) closes when the person changes. */}
          <IntroBlock key={person.id} person={person} view={data} />
          <div className="grid gap-3 md:grid-cols-3">
            {data.buckets.map((view) => (
              <BucketCard key={view.bucket} view={view} selected={pile === view.bucket} onSelect={() => setPile(view.bucket)} />
            ))}
          </div>
          <Drilldown view={data} pile={pile} onSelect={setPile} />
          <SplitStrip history={data.history} name={person.name} />
        </>
      )}
    </QueryView>
  );
}
