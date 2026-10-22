import type { MonthReport, Person } from '@/api/types';
import { useTransacoesLink, type Subject } from '@/app/view';
import { Money } from '@/components/Money';
import { ShareBar } from '@/components/bars/ShareBar';
import { PersonDisc } from '@/components/PersonDisc';
import { RowChevron, RowLink } from '@/components/RowLink';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { EmptyState } from '@/components/States';
import { personColor, STRONG_BAR } from '@/lib/colors';

/** Casa: spending per person. A person: spending per account (ADR-0004). */
export function Breakdown({ subject, people, report }: { subject: Subject; people: Person[]; report: MonthReport }) {
  const linkTo = useTransacoesLink();
  const rows =
    subject.kind === 'casa'
      ? report.byPerson.map((entry) => ({
          key: entry.personId,
          name: entry.personName,
          amountCents: entry.spendingCents,
          person: people.find((person) => person.id === entry.personId),
          to: linkTo({ kind: 'expense' }, { scope: entry.personId }),
          ariaLabel: `Ver gastos de ${entry.personName}`,
        }))
      : report.byAccount.map((entry) => ({
          key: entry.accountId,
          name: entry.accountLabel,
          amountCents: entry.amountCents,
          person: undefined,
          to: linkTo({ kind: 'expense', accountIds: [entry.accountId] }),
          ariaLabel: `Ver gastos em ${entry.accountLabel}`,
        }));
  const max = Math.max(0, ...rows.map((row) => row.amountCents));

  return (
    <SectionCard>
      <SectionHeader title={subject.kind === 'casa' ? 'Gastos por pessoa' : 'Gastos por conta'} />
      {rows.length === 0 ? (
        <EmptyState compact>Nenhum gasto neste mês.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.key}>
              <RowLink to={row.to} aria-label={row.ariaLabel} className="group flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {row.person ? <PersonDisc name={row.person.name} color={personColor(row.person)} size="sm" /> : null}
                      {row.name}
                    </span>
                    <Money cents={row.amountCents} kind="expense" />
                  </div>
                  <ShareBar value={row.amountCents} max={max} color={STRONG_BAR} size="sm" />
                </div>
                <RowChevron />
              </RowLink>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
