import { ChevronDown } from 'lucide-react';
import { memo, useState } from 'react';
import type { Category, ReviewLine, Tag } from '@/api/types';
import { CategoryPicker } from '@/components/CategoryPicker';
import { DataCell } from '@/components/DataList';
import { lineGrid, useCheckboxColumn } from '@/components/LineDataList';
import { KindSelect } from '@/components/KindSelect';
import { KindBadge, LineMeta } from '@/components/LineMeta';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TagChips } from '@/components/TagChips';
import { TagPicker } from '@/components/TagPicker';
import { IconButton } from '@/components/IconButton';
import { Money } from '@/components/Money';
import { RememberAmountCheckbox } from '@/components/RememberAmountCheckbox';
import { SelectCell } from '@/components/SelectCell';
import { Input } from '@/components/ui/input';
import { NEEDS_YOU_ROW } from '@/lib/colors';
import { formatDay } from '@/lib/format';
import { FLAG_LABEL, spreadSentence, TRANSFER_HINT } from '@/lib/labels';
import { categoryOptions, displayName, draftOf, stillNeedsYou, withCategory, withKind, type LineDraft } from '@/lib/lines';
import { isRefund, lineKindLabel, REFUND_LABEL } from '@/lib/refund';
import { useScrollIntoViewWhen } from '@/lib/useScrollIntoViewWhen';
import { cn } from '@/lib/utils';
import { NAME_MAX_LENGTH } from '../../../../shared/limits';
import type { SpreadField, SpreadOffer } from './spreadCorrection';

type Props = {
  line: ReviewLine;
  /** Undefined until the line is edited, so an untouched row keeps the same props. */
  draft: LineDraft | undefined;
  categories: Category[];
  /** False once the import is confirmed. */
  editable: boolean;
  /** One function for every row, so editing a row does not redraw the others. `field` names a change that can spread to the seller's other lines. */
  onChange: (lineId: string, draft: LineDraft, field?: SpreadField) => void;
  /** Set only on the row that was just edited, and only while other lines of its seller follow it. */
  spread?: SpreadOffer;
  /** One function for every row; only the row with a `spread` calls it. */
  onSpread?: (on: boolean) => void;
  /** Whether the tag field shows. False when the server does not know tags. */
  tagsEnabled?: boolean;
  /** One function for every row. Changing tags never makes the row a hand edit and never spreads. */
  onTags?: (lineId: string, tags: Tag[]) => void;
  /** Whether the row is ticked. Left out, the row has no checkbox; the list passes `selectable` to `LineDataList` too. */
  selected?: boolean;
  /** One function for every row, called with the row's id. */
  onSelect?: (lineId: string, checked: boolean) => void;
};

export const ReviewLineRow = memo(function ReviewLineRow({ line, draft: edited, categories, editable, onChange, spread, onSpread, tagsEnabled = false, onTags, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  // The details open under the row, which on a phone can be below the fold or under the bottom bar.
  const detailsRef = useScrollIntoViewWhen<HTMLDivElement>(open);
  const draft = edited ?? draftOf(line);
  const change = (next: LineDraft, field?: SpreadField) => onChange(line.id, next, field);
  const label = line.vendorName || line.rawDescription;
  const options = categoryOptions(categories, draft.kind, line);
  const needsYou = stillNeedsYou(draft);
  // The kind as the row shows it, with the bank's amount: a refund reads Estorno.
  const shown = { kind: draft.kind, amountCents: line.amountCents };
  const selectable = editable && selected !== undefined;
  // The second line and the notes sit under the name, which starts after the date (and the checkbox when there is one).
  const withCheckbox = useCheckboxColumn(selectable);
  const indent = withCheckbox ? 'lg:pl-[5rem]' : 'lg:pl-[3.25rem]';
  const indentMargin = withCheckbox ? 'lg:ml-[5rem]' : 'lg:ml-[3.25rem]';
  const categoryName = options.find((option) => option.id === draft.categoryId)?.name ?? '—';

  const categorySelect = (ariaLabel: string, className?: string) => (
    <CategoryPicker
      label={ariaLabel}
      className={className}
      value={draft.categoryId ?? ''}
      disabled={options.length === 0}
      options={[{ id: '', name: 'Sem categoria' }, ...options]}
      onChange={(id) => change(withCategory(draft, id || null, categories), 'category')}
    />
  );

  const kindSelect = (ariaLabel: string, className?: string) => (
    <KindSelect
      aria-label={ariaLabel}
      className={className}
      value={draft.kind}
      line={line}
      imported
      emptyLabel="Sem tipo"
      onChange={(kind) => change(withKind(draft, kind, categories), 'kind')}
    />
  );

  return (
    <li className={cn('flex flex-col gap-2 px-4 py-3 text-sm', needsYou && editable && NEEDS_YOU_ROW)}>
      <div
        className={cn(
          'group/row grid items-center gap-3',
          lineGrid('review', withCheckbox),
          draft.kind === 'transfer' && 'text-muted-out',
        )}
      >
        {selectable ? <SelectCell label={`Selecionar ${label}`} checked={selected === true} onChange={(checked) => onSelect?.(line.id, checked)} /> : null}
        <span className="hidden text-muted-foreground lg:block">{formatDay(line.date)}</span>
        {editable ? (
          <Input aria-label={`Apelido de ${label}`} maxLength={NAME_MAX_LENGTH} value={draft.nickname} onChange={(event) => change({ ...draft, nickname: event.target.value }, 'nickname')} />
        ) : (
          <DataCell label="Fornecedor" truncate className="min-w-0 font-medium">
            {draft.nickname || displayName(line)}
          </DataCell>
        )}
        {editable ? (
          categorySelect(`Categoria de ${label}`, 'hidden lg:flex')
        ) : (
          <DataCell label="Categoria" truncate className="hidden text-muted-foreground lg:block">
            {categoryName}
          </DataCell>
        )}
        {editable ? (
          kindSelect(`Tipo de ${label}`, 'hidden lg:block')
        ) : (
          <span className="hidden lg:block">
            <span className="sr-only">Tipo: </span>
            <Badge variant={draft.kind === null ? 'attention' : 'secondary'}>{lineKindLabel(shown)}</Badge>
          </span>
        )}
        <Money cents={line.amountCents} kind={draft.kind} />
        <IconButton label={`Ver detalhes de ${label}`} aria-expanded={open} onClick={() => setOpen(!open)}>
          <ChevronDown aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
        </IconButton>
        {/* Below lg the date and category sit here, under the name; "Sem tipo" is left to the flag badge below the row. */}
        <LineMeta parts={[formatDay(line.date), categoryName === '—' ? (line.categoryName ?? 'Sem categoria') : categoryName]} className="col-span-full">
          {draft.kind === null ? null : <KindBadge kind={draft.kind} amountCents={line.amountCents} />}
        </LineMeta>
      </div>

      <div className={cn('flex flex-wrap items-center gap-1.5', indent)}>
        {draft.kind === null ? <Badge variant="attention">{FLAG_LABEL.kind_unset}</Badge> : null}
        {needsYou && draft.kind !== null ? <Badge variant="attention">{FLAG_LABEL.no_category}</Badge> : null}
        {line.flags.includes('low_confidence') ? <Badge variant="outline">{FLAG_LABEL.low_confidence}</Badge> : null}
        {/* On a wide screen an editable row shows the kind as a select, which keeps reading Gasto, so the refund gets its own mark. */}
        {editable && isRefund(shown) ? <Badge variant="secondary" className="hidden lg:inline-flex">{REFUND_LABEL}</Badge> : null}
        {/* `!= null`: a server older than this client sends no installment total. */}
        {line.installmentNumber ? (
          <Badge variant="outline">{`parcela ${line.installmentNumber}${line.installmentTotal != null ? `/${line.installmentTotal}` : ''}`}</Badge>
        ) : null}
        {line.transferPairId ? <Badge variant="outline">transferência pareada</Badge> : null}
        <TagChips tags={draft.tags ?? []} />
      </div>

      {editable && spread ? (
        <label className={cn('flex min-h-11 items-center gap-2 text-sm md:min-h-6', indent)}>
          <Checkbox checked={spread.checked} onCheckedChange={(next) => onSpread?.(next === true)} />
          {spreadSentence(spread.count, spread.name)}
        </label>
      ) : null}

      {editable && draft.kind === 'transfer' ? (
        <p className={cn('text-xs text-muted-foreground', indent)}>{TRANSFER_HINT}</p>
      ) : null}

      {editable && draft.kind === 'savings' ? (
        <Input
          aria-label={`Rótulo da poupança de ${label}`}
          maxLength={NAME_MAX_LENGTH}
          placeholder="Rótulo da poupança: Cripto, Wise USD"
          className={cn('lg:max-w-sm', indentMargin)}
          value={draft.savingsLabel}
          onChange={(event) => change({ ...draft, savingsLabel: event.target.value })}
        />
      ) : null}

      {open ? (
        <div ref={detailsRef} className={cn('flex flex-col gap-3 rounded-lg bg-muted/40 p-3', indentMargin)}>
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-muted-foreground">Texto do banco</span>
            <code className="break-all font-mono">{line.rawDescription}</code>
          </div>
          {editable ? (
            <div className="grid gap-2 lg:hidden">
              {/* On narrow screens the category and kind selects live here. */}
              {categorySelect(`Categoria de ${label} (celular)`)}
              {kindSelect(`Tipo de ${label} (celular)`)}
            </div>
          ) : null}
          {editable && tagsEnabled ? <TagPicker value={draft.tags ?? []} onChange={(tags) => onTags?.(line.id, tags)} /> : null}
          {editable ? (
            <RememberAmountCheckbox
              amountCents={line.amountCents}
              checked={draft.rememberAmount}
              onChange={(rememberAmount) => change({ ...draft, rememberAmount })}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
});
