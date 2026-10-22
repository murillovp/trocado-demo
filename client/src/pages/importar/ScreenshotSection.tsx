import { getImportImage } from '@/api/endpoints';
import type { Category, ReviewLine, ReviewRow, Tag } from '@/api/types';
import { LineDataList, type HeaderSelection } from '@/components/LineDataList';
import { Money } from '@/components/Money';
import { SectionCard } from '@/components/SectionCard';
import { Badge } from '@/components/ui/badge';
import { formatDay } from '@/lib/format';
import { DUPLICATE_SAME_IMPORT_LABEL, ROW_STATUS_LABEL, SKIP_REASON_LABEL } from '@/lib/labels';
import type { LineDraft } from '@/lib/lines';
import { ReviewLineRow } from './ReviewLineRow';
import type { SpreadField, SpreadOffer } from './spreadCorrection';

type Props = {
  importId: string;
  image: { position: number; fileName: string };
  /** Every line and row of the import, unfiltered: dates and the repeated/skipped lists always show all of them. */
  allLines: ReviewLine[];
  allRows: ReviewRow[];
  /** This screenshot's lines that pass the active filter tab. */
  shownLines: ReviewLine[];
  /** The ids of this import's own lines, to tell a same-import repeat from an earlier import's duplicate. */
  thisImportLineIds: Set<string>;
  categories: Category[];
  editable: boolean;
  /** Only the lines that were edited have a draft. */
  drafts: Record<string, LineDraft>;
  onChange: (lineId: string, draft: LineDraft, field?: SpreadField) => void;
  /** The offer to change the seller's other lines, shown under the row that was just edited. */
  spread?: SpreadOffer | null;
  onSpread?: (on: boolean) => void;
  /** Whether rows show the tag field, and the one function that changes a row's tags. */
  tagsEnabled?: boolean;
  onTags?: (lineId: string, tags: Tag[]) => void;
  /** The ticked lines. Left out, the rows have no checkbox. */
  selectedIds?: ReadonlySet<string>;
  onSelect?: (lineId: string, checked: boolean) => void;
  /** The header box of this screenshot's list, from the lines it shows. Left out, the header has no box. */
  headerSelection?: (shownLines: ReviewLine[]) => HeaderSelection;
};

/** One Swile screenshot beside the lines the AI read from it (decision 8). */
export function ScreenshotSection({
  importId,
  image,
  allLines,
  allRows,
  shownLines,
  thisImportLineIds,
  categories,
  editable,
  drafts,
  onChange,
  spread,
  onSpread,
  tagsEnabled,
  onTags,
  selectedIds,
  onSelect,
  headerSelection,
}: Props) {
  const n = image.position + 1;
  const altText = `Captura ${n}: ${image.fileName}`;
  const src = getImportImage(importId, image.position);
  const lines = shownLines.filter((line) => line.imageIndex === image.position);
  const repeated = allRows.filter((row) => row.imageIndex === image.position && row.status === 'duplicate');
  const skipped = allRows.filter((row) => row.imageIndex === image.position && row.status === 'ignored');
  const dates = [
    ...allLines.filter((line) => line.imageIndex === image.position).map((line) => line.date),
    ...allRows
      .filter((row) => row.imageIndex === image.position && row.date !== null)
      .map((row) => row.date as string),
  ];
  const period = datesLabel(dates);

  return (
    <SectionCard>
      <div className="flex flex-col gap-4 xl:flex-row">
        <a href={src} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={src} alt={altText} className="max-w-[20rem] rounded-lg border" />
        </a>
        <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
          {period ? <span data-testid={`periodo-captura-${n}`} className="text-muted-foreground">{period}</span> : null}

          {lines.length > 0 ? (
            <LineDataList label={`Lançamentos da captura ${n}`} variant="review" selectable={editable && selectedIds !== undefined} headerSelection={headerSelection?.(lines)}>
              {lines.map((line) => (
                <ReviewLineRow
                  key={line.id}
                  line={line}
                  draft={drafts[line.id]}
                  categories={categories}
                  editable={editable}
                  onChange={onChange}
                  spread={spread?.lineId === line.id ? spread : undefined}
                  onSpread={onSpread}
                  tagsEnabled={tagsEnabled}
                  onTags={onTags}
                  selected={selectedIds?.has(line.id)}
                  onSelect={onSelect}
                />
              ))}
            </LineDataList>
          ) : (
            <p aria-label={`Lançamentos da captura ${n}`} className="text-muted-foreground">
              Nada nesta captura com esse filtro.
            </p>
          )}

          {repeated.length > 0 || skipped.length > 0 ? (
            <ul aria-label={`Repetidas e ignoradas da captura ${n}`} className="flex flex-col gap-1.5">
              {repeated.map((row) => (
                <RowLine key={row.sourceLine} row={row} label={duplicateLabel(row, thisImportLineIds)} />
              ))}
              {skipped.map((row) => (
                <RowLine
                  key={row.sourceLine}
                  row={row}
                  label={row.reason ? SKIP_REASON_LABEL[row.reason] : ROW_STATUS_LABEL.ignored}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function RowLine({ row, label }: { row: ReviewRow; label: string }) {
  return (
    <li className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      {/* No editor shows this text anywhere else, so it wraps instead of being cut. */}
      <span className="min-w-0 break-words text-muted-foreground">{row.text}</span>
      <span className="flex shrink-0 items-center gap-2">
        {row.amountCents === null ? '—' : <Money cents={row.amountCents} align="start" />}
        <Badge variant="outline">{label}</Badge>
      </span>
    </li>
  );
}

/** A duplicate is either a line this same import already read from an earlier screenshot, or one imported before. */
function duplicateLabel(row: ReviewRow, thisImportLineIds: Set<string>): string {
  if (row.transactionId && thisImportLineIds.has(row.transactionId)) return DUPLICATE_SAME_IMPORT_LABEL;
  return ROW_STATUS_LABEL.duplicate;
}

/** "18/09 a 22/09", or just "18/09" when every date is the same day. Empty when nothing here had a date. */
function datesLabel(dates: string[]): string | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return first === last ? formatDay(first) : `${formatDay(first)} a ${formatDay(last)}`;
}
