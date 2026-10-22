import { ChevronDown } from 'lucide-react';
import type { Category, VendorSummary } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { DataCell, type DataColumn } from '@/components/DataList';
import { IconButton } from '@/components/IconButton';
import { formatReais, plural } from '@/lib/format';
import { KIND_LABEL } from '@/lib/labels';
import type { UnsavedGuard } from '@/lib/useOpenRow';
import { cn } from '@/lib/utils';
import { isSuggested } from '@/lib/vendors';
import { VendorEditor } from './VendorEditor';

export const VENDOR_COLUMNS: DataColumn[] = [
  { key: 'nickname', label: 'Apelido' },
  { key: 'rule', label: 'Regra que reconhece' },
  { key: 'category', label: 'Categoria padrão' },
  { key: 'kind', label: 'Tipo padrão' },
  { key: 'lines', label: 'Lançamentos', align: 'end' },
  { key: 'action', label: '' },
];
export const VENDOR_GRID = 'grid-cols-[1fr_auto_2.25rem] lg:grid-cols-[1.3fr_1.5fr_1fr_0.8fr_7rem_2.25rem]';

type Props = {
  vendor: VendorSummary;
  categories: Category[];
  open: boolean;
  onToggle: () => void;
  /** Closes this row's editor, and nothing else. */
  onClose: () => void;
  /** How the open editor protects unsaved changes. */
  guard: UnsavedGuard;
};

export function VendorRow({ vendor, categories, open, onToggle, onClose, guard }: Props) {
  return (
    <li>
      <div className={cn('grid items-center gap-3 px-4 py-2.5 text-sm', VENDOR_GRID)}>
        <span className="flex min-w-0 items-center gap-2">
          <DataCell label="Apelido" truncate className="min-w-0 font-medium">
            {vendor.nickname}
          </DataCell>
          {isSuggested(vendor) ? <Badge variant="outline" className="shrink-0">IA</Badge> : null}
        </span>
        <span className="hidden min-w-0 flex-wrap items-center gap-1.5 lg:flex">
          <code title={vendor.matchName} className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{vendor.matchName}</code>
          {vendor.matchAmountCents !== null ? <Badge variant="secondary">só {formatReais(vendor.matchAmountCents)}</Badge> : null}
        </span>
        <DataCell label="Categoria padrão" truncate className="hidden text-muted-foreground lg:block">
          {vendor.defaultCategoryName ?? '—'}
        </DataCell>
        <DataCell label="Tipo padrão" className="hidden text-muted-foreground lg:block">
          {vendor.defaultKind ? KIND_LABEL[vendor.defaultKind] : '—'}
        </DataCell>
        <span className="text-right text-muted-foreground">{plural(vendor.lineCount, 'lançamento', 'lançamentos')}</span>
        <IconButton label={`Abrir ${vendor.nickname}`} aria-expanded={open} onClick={onToggle}>
          <ChevronDown aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
        </IconButton>
      </div>
      {open ? <VendorEditor vendor={vendor} categories={categories} onDone={onClose} guard={guard} /> : null}
    </li>
  );
}
