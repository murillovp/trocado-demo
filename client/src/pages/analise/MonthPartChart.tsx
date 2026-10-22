import type { AnalysisWeekAnswer } from '@/api/types';
import { ColumnChart } from '@/components/bars/ColumnChart';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { ColumnAmount } from './ColumnAmount';
import { monthPartCaption, monthPartDescription, monthPartHeading, NO_PATTERNS_NOTE } from './weekText';

type Props = {
  data: AnalysisWeekAnswer;
  /** The subject's colour, as the Mês calendar paints its days. */
  color: string;
};

/**
 * "Por parte do mês": the average spending per day in days 1 to 7, 8 to 14, 15 to 21 and 22 to the end,
 * over the counted months, as four columns in the subject's colour, each with its average above it. A sentence names the top part. Each
 * column describes itself on hover and to a screen reader; none is a link. With no counted month, one
 * line says so in place of the chart.
 */
export function MonthPartChart({ data, color }: Props) {
  const heading = monthPartHeading(data.monthParts);
  return (
    <SectionCard>
      <SectionHeader title="Por parte do mês" />
      {data.countedMonths.length === 0 ? (
        <p className="text-sm text-muted-foreground">{NO_PATTERNS_NOTE}</p>
      ) : (
        <>
          {heading ? <p className="text-sm">{heading}</p> : null}
          <ColumnChart
            label="Gasto médio por dia em cada parte do mês"
            columns={data.monthParts.map((part) => ({
              key: String(part.firstDay),
              value: part.averageCents,
              color,
              caption: monthPartCaption(part),
              above: <ColumnAmount cents={part.averageCents} />,
              description: monthPartDescription(part),
            }))}
          />
        </>
      )}
    </SectionCard>
  );
}
