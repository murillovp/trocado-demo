import { useBucketLabels } from '@/api/queries';
import type { BucketLabels, BudgetMonth } from '@/api/types';
import { useTransacoesLink, useViewPath } from '@/app/view';
import { ColumnChart } from '@/components/bars/ColumnChart';
import { Legend } from '@/components/bars/Legend';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { stripParts } from '@/lib/budget';
import { BUCKET_COLORS, NEUTRAL_BAR } from '@/lib/colors';
import { formatPct, monthLabel, monthSentenceStart, shortMonth } from '@/lib/format';

/** What a screen reader says for one month: its three shares, or why the column is empty. */
function describe(month: BudgetMonth, labels: BucketLabels): string {
  const start = monthSentenceStart(month.month);
  if (month.hasLines === false) return `${start}: sem lançamentos`;
  if (month.needsPct === null) return `${start}: sem entradas`;
  return `${start}: ${labels.needs} ${formatPct(month.needsPct)}, ${labels.wants} ${formatPct(month.wantsPct)}, ${labels.savings} ${formatPct(month.savingsPct)}`;
}

/** How the three percentages moved over the last twelve months (spec 4a). */
export function SplitStrip({ history, name }: { history: BudgetMonth[]; name: string }) {
  const linkTo = useTransacoesLink();
  const viewPath = useViewPath();
  const labels = useBucketLabels();
  const legend = [
    { label: labels.needs, color: BUCKET_COLORS.needs },
    { label: labels.wants, color: BUCKET_COLORS.wants },
    { label: labels.savings, color: BUCKET_COLORS.savings },
    { label: 'Saldo', color: NEUTRAL_BAR },
  ];
  return (
    <SectionCard>
      <SectionHeader
        title={`Como a divisão de ${name} andou`}
        action={<Legend label="Cores do gráfico" items={legend} />}
      />
      {/* From md up each part links to its lines. Below md the parts are too small to tap, so each month is one link. */}
      <div className="hidden md:block">
        <ColumnChart
          label="Divisão nos últimos 12 meses"
          columns={history.map((month) => ({
            key: month.month,
            caption: shortMonth(month.month),
            description: describe(month, labels),
            empty: stripParts(month).length === 0,
            stack: stripParts(month).map((part) => ({
              key: part.key,
              pct: part.pct,
              color: part.color,
              link:
                part.key === 'left'
                  ? undefined
                  : {
                      to: linkTo({ bucket: part.key }, { month: month.month }),
                      label: `Ver ${labels[part.key]} de ${monthLabel(month.month)}`,
                    },
            })),
          }))}
        />
      </div>
      {/* The gap is 1 px so twelve columns stay at least 24 px wide on a 375 px phone. */}
      <div className="md:hidden">
        <ColumnChart
          label="Divisão por mês (toque para abrir)"
          className="gap-px"
          columns={history.map((month) => ({
            key: month.month,
            caption: shortMonth(month.month),
            description: describe(month, labels),
            empty: stripParts(month).length === 0,
            stack: stripParts(month).map(({ key, pct, color }) => ({ key, pct, color })),
            link: { to: viewPath(`/orcamento?mes=${month.month}`), label: `Abrir ${monthLabel(month.month)} no Orçamento` },
          }))}
        />
      </div>
    </SectionCard>
  );
}
