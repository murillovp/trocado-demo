import type { AnalysisWeekAnswer } from '@/api/types';
import { ColumnChart } from '@/components/bars/ColumnChart';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { WEEKDAY_INITIALS } from '@/lib/calendar';
import { ColumnAmount } from './ColumnAmount';
import { NO_PATTERNS_NOTE, weekdayDescription, weekdayHeading } from './weekText';

type Props = {
  data: AnalysisWeekAnswer;
  /** The subject's colour, as the Mês calendar paints its days. */
  color: string;
};

/**
 * "Por dia da semana": the average spending of each weekday over the counted months, Sunday first, as
 * seven columns in the subject's colour, each with its average in whole reais above it (without "R$ "
 * below `sm`, where a column is about 40 px wide). A sentence names the top day. Each column describes itself on
 * hover and to a screen reader; none is a link, since no screen lists lines by weekday. With no counted
 * month, one line says so in place of the chart.
 */
export function WeekdayChart({ data, color }: Props) {
  const heading = weekdayHeading(data.weekdays);
  return (
    <SectionCard>
      <SectionHeader title="Por dia da semana" />
      {data.countedMonths.length === 0 ? (
        <p className="text-sm text-muted-foreground">{NO_PATTERNS_NOTE}</p>
      ) : (
        <>
          {heading ? <p className="text-sm">{heading}</p> : null}
          <ColumnChart
            label="Gasto médio por dia da semana"
            columns={data.weekdays.map((day) => ({
              key: String(day.weekday),
              value: day.averageCents,
              color,
              caption: WEEKDAY_INITIALS[day.weekday],
              above: <ColumnAmount cents={day.averageCents} shortOnPhone />,
              description: weekdayDescription(day),
            }))}
          />
        </>
      )}
    </SectionCard>
  );
}
