import { useBucketLabels } from '@/api/queries';
import type { BucketView } from '@/api/types';
import { CardLink } from '@/components/CardLink';
import { Money } from '@/components/Money';
import { TargetBar } from '@/components/bars/TargetBar';
import { gapText, gapTone } from '@/lib/budget';
import { BUCKET_COLORS } from '@/lib/colors';
import { formatPct } from '@/lib/format';
import { TONE_CLASS } from '@/lib/moneyTone';

export function BucketCard({ view, selected, onSelect }: { view: BucketView; selected: boolean; onSelect: () => void }) {
  const labels = useBucketLabels();
  const hasIncome = view.actualPct !== null;
  return (
    <CardLink selected={selected} onClick={onSelect} className="flex flex-col gap-3 p-4">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{labels[view.bucket]}</span>
        <span className="text-muted-foreground">meta {formatPct(view.targetPct)}</span>
      </span>
      <span className="flex items-baseline gap-2">
        {hasIncome ? (
          <span className="text-figure font-semibold tracking-tight">{formatPct(view.actualPct)}</span>
        ) : (
          <Money cents={view.actualCents} tone="plain" size="figure" align="start" />
        )}
        {hasIncome ? <Money cents={view.actualCents} tone="plain" align="start" className="text-body font-normal text-muted-foreground" /> : null}
      </span>
      <TargetBar actualPct={view.actualPct} targetPct={view.targetPct} color={BUCKET_COLORS[view.bucket]} />
      <span className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        {hasIncome ? (
          <span className={TONE_CLASS[gapTone(view.bucket, view.gapCents)]}>{gapText(view.bucket, view.gapCents)}</span>
        ) : (
          <span>Sem entradas para medir.</span>
        )}
        {view.targetCents !== null ? (
          <span>
            meta <Money cents={view.targetCents} tone="plain" align="start" className="font-normal" />
          </span>
        ) : null}
      </span>
    </CardLink>
  );
}
