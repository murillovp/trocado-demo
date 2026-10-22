import { useInstallments } from '@/api/queries';
import type { CommittedMonth, OpenInstallments, OpenPlan, Person } from '@/api/types';
import { SubjectGate } from '@/app/SubjectGate';
import { subjectPersonId, type Subject } from '@/app/view';
import { ColumnChart } from '@/components/bars/ColumnChart';
import { DataCell, DataList, type DataColumn } from '@/components/DataList';
import { ShareBar } from '@/components/bars/ShareBar';
import { Money } from '@/components/Money';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { QueryView } from '@/components/QueryView';
import { CardSkeleton, EmptyState } from '@/components/States';
import { SubjectHeader } from '@/components/SubjectHeader';
import { TextLink } from '@/components/TextLink';
import { STRONG_BAR } from '@/lib/colors';
import { formatReais, monthLabel, plural, shortMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

const PLAN_COLUMNS: DataColumn[] = [
  { key: 'description', label: 'Fornecedor' },
  { key: 'account', label: 'Conta' },
  { key: 'progress', label: 'Progresso' },
  { key: 'monthly', label: 'Por mês', align: 'end' },
  { key: 'owed', label: 'Falta pagar', align: 'end' },
  { key: 'end', label: 'Termina em', align: 'end' },
];
const PLAN_GRID = 'grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.4fr_1fr_1fr_1fr]';

/** Parcelas looks forward, so it has no month stepper. */
export function ParcelasPage() {
  return (
    <SubjectGate allowHousehold>
      {(subject, people) => <PlansScreen subject={subject} people={people} />}
    </SubjectGate>
  );
}

function PlansScreen({ subject, people }: { subject: Subject; people: Person[] }) {
  const installments = useInstallments();
  const personId = subjectPersonId(subject);

  const header = (data: OpenInstallments | undefined) => {
    const { plans, owed } = data ? plansOf(data, personId) : { plans: [], owed: 0 };
    return (
      <SubjectHeader
        subject={subject}
        people={people}
        allowHousehold
        showMonth={false}
        aside={data ? <OwedSummary plans={plans} owed={owed} /> : undefined}
      />
    );
  };

  return (
    <QueryView
      query={installments}
      header={header}
      loading={
        <SectionCard>
          <CardSkeleton />
        </SectionCard>
      }
    >
      {(data) => {
        const { plans, months } = plansOf(data, personId);
        return (
          <>
            {plans.length === 0 ? (
              <EmptyState>
                {'Nenhuma compra parcelada em aberto. Elas aparecem aqui quando a fatura do cartão traz "Parcela 2/10".'}
              </EmptyState>
            ) : (
              <>
                <CommittedMonths months={months} />
                <PlanList plans={plans} />
              </>
            )}
            <p className="text-sm text-muted-foreground">
              Cada parcela conta no mês da compra, como o resto do Trocado. Esta tela olha para a frente.{' '}
              <TextLink to="/transacoes">Ver os lançamentos</TextLink>
            </p>
          </>
        );
      }}
    </QueryView>
  );
}

/**
 * The plans one person (or Casa, when `personId` is missing) has open, what they still owe on them,
 * and what each coming month takes from them. The server counted the owed amount and the months for
 * Casa and for each person, so this only picks the right ones.
 */
function plansOf(data: OpenInstallments, personId: string | undefined) {
  if (!personId) return { plans: data.plans, owed: data.totalOwedCents, months: data.forecast };
  return {
    plans: data.plans.filter((plan) => plan.personId === personId),
    owed: data.owedByPerson.find((entry) => entry.personId === personId)?.owedCents ?? 0,
    months: data.forecastByPerson.find((entry) => entry.personId === personId)?.months ?? [],
  };
}

function OwedSummary({ plans, owed }: { plans: OpenPlan[]; owed: number }) {
  const lastEnd = plans.map((plan) => plan.endMonth).sort().at(-1);
  return (
    <div role="group" aria-label="Falta pagar" className="flex flex-col items-end">
      <span className="text-xs text-muted-foreground">Falta pagar</span>
      <Money cents={owed} tone="plain" size="figure" />
      <span className="text-xs text-muted-foreground">
        {lastEnd ? `${plural(plans.length, 'parcelamento', 'parcelamentos')}, o último termina em ${shortMonthYear(lastEnd)}` : 'nenhum parcelamento em aberto'}
      </span>
    </div>
  );
}

function CommittedMonths({ months }: { months: CommittedMonth[] }) {
  return (
    <SectionCard>
      <SectionHeader
        title="Quanto cada mês já está comprometido"
        action={<span className="text-xs text-muted-foreground">só as parcelas, sem os gastos do dia a dia</span>}
      />
      {/* Each screen width shows one of the two, so a screen reader meets the amounts once. */}
      <div className="hidden lg:block">
        <ColumnChart
          label="Parcelas por mês"
          columns={months.map((entry) => ({
            key: entry.month,
            value: entry.cents,
            color: STRONG_BAR,
            caption: shortMonthYear(entry.month),
            above: <Money cents={entry.cents} tone="plain" align="start" className="text-micro" />,
          }))}
        />
      </div>
      <MonthRows months={months} />
    </SectionCard>
  );
}

/** The months as rows for phones, where twelve columns with an amount each do not fit: name, bar scaled to the largest month, amount. */
function MonthRows({ months }: { months: CommittedMonth[] }) {
  const max = Math.max(0, ...months.map((entry) => entry.cents));
  return (
    <ul aria-label="Parcelas por mês (lista)" className="flex flex-col gap-3 lg:hidden">
      {months.map((entry) => (
        <li key={entry.month} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0">{monthLabel(entry.month)}</span>
          <ShareBar value={entry.cents} max={max} color={STRONG_BAR} size="sm" className="min-w-0 flex-1" />
          <Money cents={entry.cents} tone="plain" />
        </li>
      ))}
    </ul>
  );
}

function PlanList({ plans }: { plans: OpenPlan[] }) {
  return (
    <DataList label="Parcelamentos em aberto" columns={PLAN_COLUMNS} grid={PLAN_GRID}>
      {plans.map((plan) => (
        <li key={plan.id} className={cn('grid gap-x-4 gap-y-1 px-4 py-3 text-sm lg:items-center lg:gap-3', PLAN_GRID)}>
          <DataCell label="Fornecedor" className="col-span-2 min-w-0 break-words font-medium lg:col-span-1">
            {plan.description}
          </DataCell>
          <DataCell label="Conta" className="min-w-0 break-words text-muted-foreground">
            {plan.accountLabel}
          </DataCell>
          <span className="flex flex-col gap-1">
            <DataCell label="Progresso">{`${plan.paidCount} de ${plan.totalInstallments}`}</DataCell>
            <ShareBar value={plan.paidCount} max={plan.totalInstallments} color={STRONG_BAR} size="sm" />
          </span>
          <span className="lg:text-right">{formatReais(plan.installmentAmountCents)} por mês</span>
          <DataCell label="Falta pagar" className="lg:text-right">
            <Money cents={plan.owedCents} tone="plain" align="start" />
          </DataCell>
          <DataCell label="Termina em" className="text-muted-foreground lg:text-right">
            {shortMonthYear(plan.endMonth)}
          </DataCell>
        </li>
      ))}
    </DataList>
  );
}
