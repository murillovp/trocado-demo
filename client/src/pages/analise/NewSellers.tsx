import type { NewSeller } from '@/api/types';
import { useTransacoesLink } from '@/app/view';
import { Money } from '@/components/Money';
import { RowChevron, RowLink } from '@/components/RowLink';
import { ShowMoreList } from '@/components/ShowMoreList';
import { plural } from '@/lib/format';
import type { LinkFilters } from '@/lib/transacoesLink';

/**
 * "Fornecedores novos": sellers whose first spending line falls in the month, with what they took and
 * their category. Shows the five largest, then "Ver todos". A row opens Transações searching for the seller's name. Left out when there are none.
 */
export function NewSellers({ sellers, carried }: { sellers: NewSeller[]; carried: LinkFilters }) {
  const linkTo = useTransacoesLink();
  if (sellers.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-body font-semibold">Fornecedores novos</h3>
      <ShowMoreList
        items={sellers}
        itemKey={(seller) => seller.sellerName}
        renderItem={(seller) => (
          <RowLink
            to={linkTo({ ...carried, kind: 'expense', search: seller.sellerName })}
            aria-label={`Ver lançamentos de ${seller.sellerName}`}
            className="group flex items-start gap-2"
          >
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 break-words">{seller.sellerName}</span>
              <span className="block text-xs text-muted-foreground">
                {seller.categoryName ?? 'Sem categoria'} · {plural(seller.lineCount, 'lançamento', 'lançamentos')}
              </span>
            </span>
            <Money cents={seller.amountCents} kind="expense" />
            <RowChevron className="mt-0.5" />
          </RowLink>
        )}
      />
    </div>
  );
}
