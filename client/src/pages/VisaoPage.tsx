import { useHistory, useLatestMonth, useMonthReport } from '@/api/queries';
import type { Person } from '@/api/types';
import { SubjectGate } from '@/app/SubjectGate';
import { subjectPersonId, useView, type Subject } from '@/app/view';
import { Notice } from '@/components/Notice';
import { QueryView } from '@/components/QueryView';
import { PendingImportNotice } from '@/components/PendingImportNotice';
import { PageSkeleton } from '@/components/States';
import { SubjectHeader } from '@/components/SubjectHeader';
import { TextLink } from '@/components/TextLink';
import { currentMonth, monthSentence, monthSentenceStart } from '@/lib/format';
import { Breakdown } from './visao/Breakdown';
import { BudgetSummary } from './visao/BudgetSummary';
import { CategoryBars } from './visao/CategoryBars';
import { HistoryBars } from './visao/HistoryBars';
import { InstallmentsCard } from './visao/InstallmentsCard';
import { TotalsCards } from './visao/TotalsCards';

export function VisaoPage() {
  return (
    <SubjectGate allowHousehold>
      {(subject, people) => <MonthScreen subject={subject} people={people} />}
    </SubjectGate>
  );
}

function MonthScreen({ subject, people }: { subject: Subject; people: Person[] }) {
  const { month } = useView();
  const personId = subjectPersonId(subject);
  const report = useMonthReport(month, personId);
  const history = useHistory(month, personId);
  // A failed or missing answer simply hides the notes that need it.
  const latestMonth = useLatestMonth().data ?? null;

  return (
    <QueryView query={report} loading={<PageSkeleton />} header={<SubjectHeader subject={subject} people={people} allowHousehold />}>
      {(data) =>
        isEmptyMonth(data) ? (
          <>
            <PendingImportNotice />
            <EmptyMonthNotice month={month} latestMonth={latestMonth} />
          </>
        ) : (
          <>
            <PendingImportNotice />
            {month === latestMonth && currentMonth() > latestMonth ? (
              <Notice>
                <p>
                  {monthSentenceStart(currentMonth())} ainda não tem lançamentos. Este é o último mês com lançamentos.
                </p>
              </Notice>
            ) : null}
            <TotalsCards totals={data.totals} unsetCount={data.unsetCount} />
            <InstallmentsCard personId={personId} />
            <BudgetSummary subject={subject} people={people} month={month} />
            <div className="grid gap-4 lg:grid-cols-2">
              <CategoryBars items={data.byCategory} />
              <div className="flex flex-col gap-4">
                <Breakdown subject={subject} people={people} report={data} />
                <HistoryBars history={history} month={month} color={subject.color} />
              </div>
            </div>
          </>
        )
      }
    </QueryView>
  );
}

/** What an empty month shows instead of its cards of zeros: where to import, and where the data is. */
function EmptyMonthNotice({ month, latestMonth }: { month: string; latestMonth: string | null }) {
  return (
    <Notice className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
      <p>
        Nada em {monthSentence(month)} ainda.{' '}
        <TextLink to="/transacoes/importar" className="font-medium">
          Importar um extrato
        </TextLink>
      </p>
      {latestMonth !== null && latestMonth !== month ? (
        <TextLink to={`/?mes=${latestMonth}`} className="font-medium">
          Ir para {monthSentence(latestMonth)}
        </TextLink>
      ) : null}
    </Notice>
  );
}

function isEmptyMonth(report: { totals: { incomeCents: number; spendingCents: number; savingsCents: number }; unsetCount: number }): boolean {
  const { incomeCents, spendingCents, savingsCents } = report.totals;
  return incomeCents === 0 && spendingCents === 0 && savingsCents === 0 && report.unsetCount === 0;
}
