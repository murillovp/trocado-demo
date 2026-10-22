import type { TagDetail as TagDetailAnswer } from '@/api/types';
import { HOUSEHOLD, useTransacoesLink } from '@/app/view';
import { ShareBar } from '@/components/bars/ShareBar';
import { Money } from '@/components/Money';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { EmptyState } from '@/components/States';
import { TextLink } from '@/components/TextLink';
import { BUCKET_COLORS, UNCLASSIFIED_COLOR } from '@/lib/colors';
import { formatDate, formatPct, plural } from '@/lib/format';

/**
 * A tag's story on the Tags page: its total spending, its dates, the spending split by category
 * (largest first, each a bar as long as its share) and a link to its lines on Transações for Casa, across every month.
 * The server counts the figures; this part only shows them.
 */
export function TagDetail({ detail }: { detail: TagDetailAnswer }) {
  const linkTo = useTransacoesLink();
  const hasLines = detail.firstDate !== null && detail.lastDate !== null;

  return (
    <SectionCard role="region" aria-label={`Detalhe da tag ${detail.name}`}>
      <SectionHeader
        title={<span className="min-w-0 break-words">{detail.name}</span>}
        description={hasLines ? plural(detail.lineCount, 'lançamento', 'lançamentos') : 'Sem lançamentos'}
      />
      {hasLines ? (
        <>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Gasto total</span>
            <Money cents={detail.spendingCents} kind="expense" size="figure" align="start" />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Primeiro lançamento</dt>
              <dd>{formatDate(detail.firstDate ?? '')}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Último lançamento</dt>
              <dd>{formatDate(detail.lastDate ?? '')}</dd>
            </div>
          </dl>
          {detail.byCategory.length === 0 ? (
            <EmptyState compact>Nenhum gasto nesta tag.</EmptyState>
          ) : (
            <ul aria-label="Gasto por categoria" className="flex flex-col gap-3">
              {detail.byCategory.map((row) => (
                <li key={row.categoryId ?? 'sem-categoria'} className="flex flex-col gap-1.5">
                  <span className="flex items-start gap-2 text-sm">
                    <span className="min-w-0 flex-1 line-clamp-2 break-words">{row.categoryName ?? 'Sem categoria'}</span>
                    <Money cents={row.amountCents} kind="expense" />
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">{formatPct(row.sharePct)}</span>
                  </span>
                  <ShareBar
                    value={row.sharePct ?? 0}
                    color={row.bucket ? BUCKET_COLORS[row.bucket] : UNCLASSIFIED_COLOR}
                  />
                </li>
              ))}
            </ul>
          )}
          <TextLink to={linkTo({ tagId: detail.tagId, kind: 'expense', allMonths: true }, { scope: HOUSEHOLD })} className="text-sm">
            Ver lançamentos
          </TextLink>
        </>
      ) : null}
    </SectionCard>
  );
}
