import type { ReviewRow } from '@/api/types';
import { DataCell, DataList, type DataColumn } from '@/components/DataList';
import { Money } from '@/components/Money';
import { TextLink } from '@/components/TextLink';
import { Badge } from '@/components/ui/badge';
import { formatDay, formatTimestamp } from '@/lib/format';
import { DUPLICATE_SAME_IMPORT_LABEL, ROW_STATUS_LABEL, SKIP_REASON_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';

const COLUMNS: DataColumn[] = [
  { key: 'line', label: 'Linha' },
  { key: 'date', label: 'Data' },
  { key: 'text', label: 'Texto do banco' },
  { key: 'amount', label: 'Valor', align: 'end' },
  { key: 'status', label: 'O que aconteceu' },
];
const GRID = 'grid-cols-[1fr_auto] lg:grid-cols-[4.5rem_3.5rem_1fr_7.5rem_14rem]';

/**
 * Every row the file had, in file order, and what happened to each (ADR-0006).
 * Below `lg` a row has three lines: "Linha N · date" with the amount, the bank text,
 * then the status. `order` puts the amount on line one without moving it in the
 * DOM, so from `lg` the cells keep the order the header names.
 */
export function FileRows({ rows, importId }: { rows: ReviewRow[]; importId: string }) {
  return (
    <DataList label="Linhas do arquivo" columns={COLUMNS} grid={GRID} className="text-sm">
      {rows.map((row) => (
        <li key={row.sourceLine} className={cn('grid items-center gap-3 px-4 py-2', GRID)}>
          {/* One cell below lg; from lg the two are separate columns. */}
          <span className="flex gap-1.5 lg:contents">
            <span className="text-muted-foreground">Linha {row.sourceLine}</span>
            <span aria-hidden="true" className="text-muted-foreground lg:hidden">·</span>
            <DataCell label="Data">{row.date ? formatDay(row.date) : '—'}</DataCell>
          </span>
          {/* This screen is the only place the bank's text can be read in full, so it wraps instead of being cut. */}
          <DataCell label="Texto do banco" className="order-2 col-span-full min-w-0 break-words lg:order-none lg:col-span-1">
            {row.text}
          </DataCell>
          {row.amountCents === null ? <span className="text-right">—</span> : <Money cents={row.amountCents} />}
          <span className="order-3 col-span-full lg:order-none lg:col-span-1">
            <RowStatus row={row} importId={importId} />
          </span>
        </li>
      ))}
    </DataList>
  );
}

function RowStatus({ row, importId }: { row: ReviewRow; importId: string }) {
  if (row.status === 'duplicate') {
    // A repeat whose earlier occurrence is a screenshot of this same import
    // is not "already imported": it was just read again, with no import to
    // link to.
    if (row.earlierImportId === importId) return <span>{DUPLICATE_SAME_IMPORT_LABEL}</span>;

    const label = row.earlierImportedAt
      ? `${ROW_STATUS_LABEL.duplicate} em ${formatTimestamp(row.earlierImportedAt)}`
      : ROW_STATUS_LABEL.duplicate;
    return row.earlierImportId ? (
      <TextLink to={`/transacoes/importar/${row.earlierImportId}`}>
        {label}
      </TextLink>
    ) : (
      <span>{label}</span>
    );
  }
  if (row.status === 'ignored') {
    return <Badge variant="outline">{`${ROW_STATUS_LABEL.ignored}: ${row.reason ? SKIP_REASON_LABEL[row.reason] : 'sem motivo'}`}</Badge>;
  }
  return <Badge variant="secondary">{ROW_STATUS_LABEL.imported}</Badge>;
}
