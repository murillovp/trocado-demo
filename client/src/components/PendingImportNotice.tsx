import { useImports } from '@/api/queries';
import type { ImportHistoryEntry } from '@/api/types';
import { Notice } from '@/components/Notice';
import { TextLink } from '@/components/TextLink';
import { formatDay } from '@/lib/format';

/** "Nubank conta, 03/09 a 30/09": the account, and the period when the file had one. */
function describe(entry: ImportHistoryEntry): string {
  if (!entry.periodStart || !entry.periodEnd) return entry.accountLabel;
  return `${entry.accountLabel}, ${formatDay(entry.periodStart)} a ${formatDay(entry.periodEnd)}`;
}

/**
 * Tells that an import waits for review, with a link to it. One waiting import is named;
 * several are counted and the link opens the oldest. Shows nothing while the list loads,
 * when it fails (the history below it says so) or when nothing waits.
 */
export function PendingImportNotice() {
  const waiting = (useImports().data ?? []).filter((entry) => entry.status === 'pending');
  const [oldest] = [...waiting].sort((a, b) => a.importedAt.localeCompare(b.importedAt));
  if (!oldest) return null;

  const text =
    waiting.length === 1 ? `1 importação espera revisão: ${describe(oldest)}.` : `${waiting.length} importações esperam revisão.`;
  return (
    <Notice tone="attention" className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p>{text}</p>
      <TextLink to={`/transacoes/importar/${oldest.id}`} className="font-medium">
        Revisar
      </TextLink>
    </Notice>
  );
}
