import { useContext, type CSSProperties } from 'react';
import type { AnalysisMonthAnswer, CalendarDay } from '@/api/types';
import { SubjectContext, useTransacoesLink } from '@/app/view';
import { Clickable } from '@/components/Clickable';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { calendarFigures, calendarWeeks, daySentence, shadeSteps, WEEKDAY_INITIALS, WEEKDAY_NAMES } from '@/lib/calendar';
import { formatDayLong, formatReais, monthSentence, todayIso } from '@/lib/format';
import { HOUSEHOLD_COLOR } from '@/lib/colors';
import { FOCUS_RING } from '@/lib/interaction';
import type { LinkFilters } from '@/lib/transacoesLink';
import { cn } from '@/lib/utils';

type Props = {
  data: AnalysisMonthAnswer;
  /** Análise's current filters, carried by every link to Transações. */
  carried: LinkFilters;
};

/**
 * "Gasto por dia": the month as a calendar, weeks as rows and Sunday first, each day shaded in five
 * steps of the subject's colour by its spending. A day with spending links to its lines on
 * Transações. Below `lg` a day shows its number only; the amount is in the tooltip and the name.
 * Left out when the answer holds no days.
 */
export function SpendingCalendar({ data, carried }: Props) {
  const { calendar, leftOutInstallmentsCents } = data;
  const subject = useContext(SubjectContext);
  const color = subject?.color ?? HOUSEHOLD_COLOR;
  if (calendar.length === 0) return null;

  const dayShades = shadeSteps(calendar);
  const steps = new Map(calendar.map((day, index) => [day.date, dayShades[index]!]));
  const figures = calendarFigures(calendar);
  const today = todayIso();

  return (
    <SectionCard>
      <SectionHeader title="Gasto por dia" />
      <table
        aria-label={`Gasto por dia em ${monthSentence(data.month)}`}
        className="w-full table-fixed border-separate border-spacing-1"
        style={{ '--calendar-subject': color } as CSSProperties}
      >
        <thead>
          <tr>
            {WEEKDAY_INITIALS.map((initial, weekday) => (
              <th
                key={WEEKDAY_NAMES[weekday]}
                scope="col"
                aria-label={WEEKDAY_NAMES[weekday]}
                title={WEEKDAY_NAMES[weekday]}
                className="pb-1 text-caption font-medium text-muted-foreground"
              >
                {initial}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks(calendar).map((week) => (
            <tr key={week.find((cell) => cell !== null)?.date}>
              {week.map((day, place) => (
                <td key={day?.date ?? `empty-${place}`} className="p-0">
                  {day ? <DayCell day={day} step={steps.get(day.date) ?? 0} future={day.date > today} carried={carried} /> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {leftOutInstallmentsCents > 0 ? (
        <p className="text-sm text-muted-foreground">
          Parcelas a partir da 2ª ficam fora do calendário: {formatReais(leftOutInstallmentsCents)} neste mês.
        </p>
      ) : null}
      {figures ? (
        <div className="flex flex-col gap-1 text-sm">
          <p>
            Maior gasto em um dia: {formatDayLong(figures.highest.date)}, {formatReais(figures.highest.spendingCents)}.
          </p>
          <p>Média por dia com gastos: {formatReais(figures.averageCents)}.</p>
        </div>
      ) : null}
    </SectionCard>
  );
}

const DAY_CLASS =
  'calendar-day flex min-h-10 flex-col items-center justify-center rounded-md border text-caption lg:min-h-14';

/** One day: shaded by its step, dashed when still to come, a link to its lines when it has any. */
function DayCell({ day, step, future, carried }: { day: CalendarDay; step: number; future: boolean; carried: LinkFilters }) {
  const linkTo = useTransacoesLink();
  const sentence = daySentence(day);
  const number = Number(day.date.slice(8));
  const className = cn(DAY_CLASS, future ? 'border-dashed border-input' : 'border-border');
  const dataStep = step > 0 ? step : undefined;

  if (day.lineCount === 0) {
    return (
      <div data-step={dataStep} title={sentence} className={className}>
        <span aria-hidden="true">{number}</span>
        <span className="sr-only">{sentence}</span>
      </div>
    );
  }
  return (
    <Clickable
      to={linkTo({ ...carried, kind: 'expense', date: day.date })}
      data-step={dataStep}
      title={sentence}
      aria-label={sentence}
      className={cn(className, 'transition-shadow hover:ring-2 hover:ring-ring', FOCUS_RING)}
    >
      <span>{number}</span>
      <span className="hidden whitespace-nowrap text-micro lg:block">{formatReais(day.spendingCents)}</span>
    </Clickable>
  );
}
