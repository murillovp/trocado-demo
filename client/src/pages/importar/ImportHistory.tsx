import { useImports } from '@/api/queries';
import type { ImportHistoryEntry } from '@/api/types';
import { DataList, type DataColumn } from '@/components/DataList';
import { SectionHeader } from '@/components/SectionCard';
import { QueryView } from '@/components/QueryView';
import { EmptyState, ListSkeleton } from '@/components/States';
import { TextLink } from '@/components/TextLink';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTimestamp } from '@/lib/format';
import { IMPORT_STATUS_LABEL, rowsSentence } from '@/lib/labels';
import { cn } from '@/lib/utils';

const COLUMNS: DataColumn[] = [
  { key: 'file', label: 'Conta e arquivo' },
  { key: 'period', label: 'Período' },
  { key: 'counts', label: 'Linhas' },
  { key: 'status', label: 'Situação' },
  { key: 'action', label: '' },
];
/** Status and counts keep their own columns, so they land in the same place on every row. */
const GRID = 'lg:grid-cols-[1.3fr_1.5fr_1.6fr_6.5rem_6rem]';

function period(entry: ImportHistoryEntry): string {
  const sent = `enviado em ${formatTimestamp(entry.importedAt)}`;
  if (!entry.periodStart || !entry.periodEnd) return sent;
  return `${formatDate(entry.periodStart)} a ${formatDate(entry.periodEnd)} · ${sent}`;
}

export function ImportHistory() {
  const imports = useImports();
  return (
    <section className="flex flex-col gap-3">
      <QueryView
        query={imports}
        header={<SectionHeader title="Arquivos importados" />}
        loading={<ListSkeleton />}
        className="flex flex-col gap-3"
      >
        {(entries) => <ImportList entries={entries} />}
      </QueryView>
    </section>
  );
}

function ImportList({ entries }: { entries: ImportHistoryEntry[] }) {
  return (
    <>
      {entries.length === 0 ? (
        <EmptyState>Nenhum arquivo importado ainda. Escolha o primeiro extrato acima.</EmptyState>
      ) : (
        <DataList label="Arquivos importados" columns={COLUMNS} grid={GRID}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm lg:grid lg:gap-3', GRID)}
            >
              {/* Inline with the rest on a phone; its own two-line column on a wide screen. */}
              <span className="contents lg:flex lg:min-w-0 lg:flex-col">
                <span className="font-medium">{entry.accountLabel}</span>
                <span className="text-muted-foreground lg:break-words">{entry.fileName}</span>
              </span>
              <span className="text-muted-foreground lg:min-w-0">{period(entry)}</span>
              <span className="basis-full lg:min-w-0 lg:basis-auto">{rowsSentence(entry.counts)}</span>
              <span>
                <Badge variant={entry.status === 'pending' ? 'default' : 'secondary'}>{IMPORT_STATUS_LABEL[entry.status]}</Badge>
              </span>
              <TextLink to={`/transacoes/importar/${entry.id}`} className="ml-auto font-medium lg:ml-0 lg:justify-self-end">
                {entry.status === 'pending' ? 'Revisar' : 'Ver linhas'}
              </TextLink>
            </li>
          ))}
        </DataList>
      )}
    </>
  );
}
