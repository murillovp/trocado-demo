import { ChevronDown } from 'lucide-react';
import type { Category, LedgerLine } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { DataCell } from '@/components/DataList';
import { IconButton } from '@/components/IconButton';
import { KindBadge, LineMeta } from '@/components/LineMeta';
import { useLineGrid } from '@/components/LineDataList';
import { Money } from '@/components/Money';
import { OwnerDot } from '@/components/OwnerDot';
import { SelectCell } from '@/components/SelectCell';
import { TagChips } from '@/components/TagChips';
import { formatDay } from '@/lib/format';
import { displayName } from '@/lib/lines';
import { lineKindLabel } from '@/lib/refund';
import type { UnsavedGuard } from '@/lib/useOpenRow';
import { cn } from '@/lib/utils';
import { isSuggestedLine } from '@/lib/vendors';
import { LineEditor } from './LineEditor';

type Props = {
  line: LedgerLine;
  categories: Category[];
  open: boolean;
  onToggle: () => void;
  /** Closes this row's editor, and nothing else. */
  onClose: () => void;
  /** How the open editor protects unsaved changes. */
  guard: UnsavedGuard;
  /** Whose line this is. Only Casa view passes it, so a row there says whose it is. */
  owner?: { name: string; color: string };
  /** Makes the row selectable: whether it is ticked, and what ticking it does. The list passes `selectable` to `LineDataList` too. */
  selection?: { checked: boolean; onChange: (checked: boolean) => void };
};

export function LineRow({ line, categories, open, onToggle, onClose, guard, owner, selection }: Props) {
  const name = displayName(line);
  const grid = useLineGrid('ledger', selection !== undefined);
  return (
    <li>
      {/* A line outside the totals is muted across the whole row, not only the amount. */}
      <div
        className={cn(
          'group/row grid items-start gap-3 px-4 py-2.5 text-sm lg:items-center',
          grid,
          line.kind === 'transfer' && 'text-muted-out',
        )}
      >
        {selection ? <SelectCell label={`Selecionar ${name}`} checked={selection.checked} onChange={selection.onChange} /> : null}
        <span className="hidden text-muted-foreground lg:block">{formatDay(line.date)}</span>
        {/* Below lg this cell is two lines: the name, then the date, category, account and badges, wrapping. */}
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 lg:flex-nowrap lg:gap-1.5">
          {/* The dot and the name stay on one line at every width; only what follows may wrap. */}
          <span className="flex min-h-8 min-w-0 basis-full items-center gap-1.5 lg:min-h-0 lg:basis-auto">
            {owner ? <OwnerDot name={owner.name} color={owner.color} /> : null}
            <DataCell label="Fornecedor" truncate className="min-w-0 font-medium">
              {name}
            </DataCell>
          </span>
          <LineMeta parts={[formatDay(line.date), line.categoryName ?? 'Sem categoria', line.accountLabel]}>
            <KindBadge kind={line.kind} amountCents={line.amountCents} />
          </LineMeta>
          {/* `?? []`: a server older than this client sends no tags. */}
          <TagChips tags={line.tags ?? []} />
          {line.installment ? (
            <Badge variant="outline" className="shrink-0">
              parcela {line.installment.number}/{line.installment.total}
            </Badge>
          ) : null}
          {line.kind === 'savings' && line.savingsLabel ? <Badge variant="outline" className="shrink-0">{line.savingsLabel}</Badge> : null}
          {line.isManual ? <Badge variant="outline" className="shrink-0">à mão</Badge> : null}
          {/* The seller rule is still the AI's guess; accepting it or editing the seller removes the mark. */}
          {isSuggestedLine(line) ? <Badge variant="outline" className="shrink-0">IA</Badge> : null}
          {/* `!= null`, not `!== null`: a server older than this client sends no bankAmountCents. */}
          {line.bankAmountCents != null ? <Badge variant="outline" className="shrink-0">valor ajustado</Badge> : null}
        </span>
        <DataCell label="Categoria" truncate className="hidden text-muted-foreground lg:block">
          {line.categoryName ?? '—'}
        </DataCell>
        <DataCell label="Conta" truncate className="hidden text-muted-foreground lg:block">
          {line.accountLabel}
        </DataCell>
        <span className="hidden lg:block">
          <span className="sr-only">Tipo: </span>
          <Badge variant={line.kind === null ? 'attention' : 'secondary'}>{lineKindLabel(line)}</Badge>
        </span>
        {/* The amount's line is as tall as the button, so it sits level with the name. */}
        <Money cents={line.amountCents} kind={line.kind} className="leading-8 lg:leading-[inherit]" />
        <IconButton label={`Abrir detalhes de ${name}`} aria-expanded={open} onClick={onToggle}>
          <ChevronDown aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
        </IconButton>
      </div>
      {open ? <LineEditor line={line} categories={categories} onDone={onClose} guard={guard} /> : null}
    </li>
  );
}
