import type { UnusualLine } from '@/api/types';
import { useTransacoesLink } from '@/app/view';
import { RowChevron, RowLink } from '@/components/RowLink';
import { ShowMoreList } from '@/components/ShowMoreList';
import { unusualSentence } from '@/lib/analise';
import { formatDayLong } from '@/lib/format';
import type { LinkFilters } from '@/lib/transacoesLink';

/**
 * "Fora do padrão": charges of the month well above the seller's usual, and the same charge twice.
 * A row opens that day on Transações, searching for the seller. The section only points; it changes nothing.
 * Shows the five largest, then "Ver todos". Left out when there are none.
 */
export function UnusualLines({ lines, carried }: { lines: UnusualLine[]; carried: LinkFilters }) {
  const linkTo = useTransacoesLink();
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-body font-semibold">Fora do padrão</h3>
      <ShowMoreList
        items={lines}
        itemKey={(line) => line.lineIds.join('+')}
        renderItem={(line) => {
          const sentence = unusualSentence(line);
          return (
            <RowLink
              to={linkTo({ ...carried, kind: 'expense', date: line.date, search: line.sellerName })}
              aria-label={`Ver lançamentos: ${sentence}`}
              className="group flex items-start gap-2"
            >
              <span className="min-w-0 flex-1">
                <span className="break-words">{sentence}</span>
                {line.reason === 'above_usual' ? (
                  <span className="block text-xs text-muted-foreground">{formatDayLong(line.date)}</span>
                ) : null}
              </span>
              <RowChevron className="mt-0.5" />
            </RowLink>
          );
        }}
      />
    </div>
  );
}
