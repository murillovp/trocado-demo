import { Fragment, useId, type ReactNode } from 'react';
import { useBucketLabels, useBudget } from '@/api/queries';
import type { BucketView, Person } from '@/api/types';
import { useView, type Subject } from '@/app/view';
import { StackBar } from '@/components/bars/StackBar';
import { TargetBar } from '@/components/bars/TargetBar';
import { Money } from '@/components/Money';
import { PersonDisc } from '@/components/PersonDisc';
import { RowChevron, RowLink } from '@/components/RowLink';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { QueryView, STALE_CLASSES } from '@/components/QueryView';
import { CardSkeleton, ErrorState } from '@/components/States';
import { TextLink } from '@/components/TextLink';
import { spentText } from '@/lib/budget';
import { BUCKET_COLORS, personColor } from '@/lib/colors';
import { formatPct, plural } from '@/lib/format';
import { cn } from '@/lib/utils';

/** A person gets three bars. Casa gets one compact row per person (ADR-0004). */
export function BudgetSummary({ subject, people, month }: { subject: Subject; people: Person[]; month: string }) {
  return (
    <SectionCard>
      <SectionHeader
        title="Orçamento 50/30/20"
        action={
          <TextLink to="/orcamento" className="text-sm">
            Abrir orçamento
          </TextLink>
        }
      />
      {subject.kind === 'person' ? (
        <PersonBars personId={subject.person.id} month={month} />
      ) : (
        <ul className="flex flex-col gap-1">
          {people.map((person) => (
            <PersonRow key={person.id} person={person} month={month} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function PersonBars({ personId, month }: { personId: string; month: string }) {
  const budget = useBudget(month, personId);
  return (
    <QueryView query={budget} loading={<CardSkeleton />} inline className="flex flex-col">
      {(data) => (
        <div className="grid gap-5 md:grid-cols-3">
          {data.buckets.map((view) => (
            <BucketBar key={view.bucket} view={view} />
          ))}
        </div>
      )}
    </QueryView>
  );
}

function BucketBar({ view }: { view: BucketView }) {
  const labels = useBucketLabels();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{labels[view.bucket]}</span>
        {view.actualPct === null ? (
          <Money cents={view.actualCents} tone="plain" className="font-normal" />
        ) : (
          <span>
            {formatPct(view.actualPct)} <span className="text-muted-foreground">/ {formatPct(view.targetPct)}</span>
          </span>
        )}
      </div>
      <TargetBar actualPct={view.actualPct} targetPct={view.targetPct} color={BUCKET_COLORS[view.bucket]} />
      <span className="text-xs text-muted-foreground">
        {view.actualPct === null ? 'Sem entradas para medir.' : spentText(view.bucket, view.actualCents, labels.savings)}
      </span>
    </div>
  );
}

/**
 * How many of the needs and wants groups are above their target, by the gap in cents as Orçamento
 * reads it (the rounded percentages can tie at the line). Savings above target is good news, so it never counts.
 */
function groupsOverTarget(buckets: BucketView[]): number {
  return buckets.filter((view) => view.bucket !== 'savings' && view.gapCents !== null && view.gapCents > 0).length;
}

function PersonRow({ person, month }: { person: Person; month: string }) {
  const { setScope } = useView();
  const budget = useBudget(month, person.id);
  const labels = useBucketLabels();
  const numbersId = useId();
  const chipId = useId();

  if (budget.isError) {
    return (
      <li>
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-sm sm:flex-nowrap">
          <PersonDisc name={person.name} color={personColor(person)} size="sm" />
          <span className="font-medium sm:w-20">{person.name}</span>
          <div className="basis-full sm:flex-1">
            <ErrorState inline error={budget.error} onRetry={() => void budget.refetch()} />
          </div>
        </div>
      </li>
    );
  }

  const buckets = budget.data?.buckets ?? [];
  // Each "group pct" pair stays on one line, so a wrap falls between pairs, never inside one.
  const summary: ReactNode = !budget.data
    ? 'carregando…'
    : budget.data.baseIncomeCents > 0
      ? buckets.map((view, index) => (
          <Fragment key={view.bucket}>
            {index > 0 ? ' · ' : null}
            <span className="whitespace-nowrap">
              {labels[view.bucket]} {formatPct(view.actualPct)}
            </span>
          </Fragment>
        ))
      : 'sem entradas no mês';
  const over = budget.data && budget.data.baseIncomeCents > 0 ? groupsOverTarget(buckets) : 0;

  return (
    <li aria-busy={budget.isPlaceholderData || undefined} className={cn(budget.isPlaceholderData && STALE_CLASSES)}>
      {/*
        Below lg the row has three lines: name, chip and arrow; the bar; the numbers under it. A line
        with the group names, the bar, the chip and the arrow needs about 600 px, more than the card has before lg.
      */}
      <RowLink
        onClick={() => setScope(person.id)}
        aria-label={`Ver o orçamento de ${person.name}`}
        aria-describedby={over > 0 ? `${chipId} ${numbersId}` : numbersId}
        className="mx-0 flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg py-2 lg:flex-nowrap"
      >
        <PersonDisc name={person.name} color={personColor(person)} size="sm" />
        <span className="font-medium lg:w-20">{person.name}</span>
        {over > 0 ? (
          <span id={chipId} className="shrink-0 rounded-md bg-negative-soft px-2 py-0.5 text-xs font-medium text-negative lg:order-1">
            {plural(over, 'grupo', 'grupos')} acima da meta
          </span>
        ) : null}
        <RowChevron className="ml-auto lg:order-2" />
        <StackBar
          size="sm"
          className="order-last basis-full lg:order-none lg:min-w-24 lg:flex-1 lg:basis-0"
          parts={buckets.map((view) => ({ key: view.bucket, pct: view.actualPct ?? 0, color: BUCKET_COLORS[view.bucket] }))}
        />
        <span id={numbersId} className="order-last basis-full text-xs text-muted-foreground lg:order-none lg:basis-auto lg:shrink-0">
          {summary}
        </span>
      </RowLink>
    </li>
  );
}
