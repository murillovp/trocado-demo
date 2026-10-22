import type { ReactNode } from 'react';
import { DataList, type DataColumn } from '@/components/DataList';
import { SelectCell, useSelectColumn } from '@/components/SelectCell';

/**
 * Transações and the import review draw a line the same way: date, name, category,
 * kind, amount, then the button that opens the details. Transações adds the account,
 * because its lines come from every account; a review is of one account, so it leaves
 * that column out. The columns that both have are the same width, in the same place.
 * Below `lg` the row has three columns (name, amount, button) and a second line that
 * carries the date, category and account; the wide template is unchanged. A list whose
 * rows can be selected adds a narrow first column for the checkbox, at every width, except
 * on a touch screen before "Selecionar": there the column takes no width, so rows use the
 * full width. Pointer devices keep the column, so rows never shift.
 */
export type LineVariant = 'ledger' | 'review';

const DATE: DataColumn = { key: 'date', label: 'Data' };
const NAME: DataColumn = { key: 'name', label: 'Fornecedor' };
const CATEGORY: DataColumn = { key: 'category', label: 'Categoria' };
const ACCOUNT: DataColumn = { key: 'account', label: 'Conta' };
const KIND: DataColumn = { key: 'kind', label: 'Tipo' };
const AMOUNT: DataColumn = { key: 'amount', label: 'Valor', align: 'end' };
const ACTION: DataColumn = { key: 'action', label: '' };
/** The checkbox column of a list whose rows can be selected. Its header is empty. */
const SELECT: DataColumn = { key: 'select', label: '' };

const LAYOUTS: Record<LineVariant, { columns: DataColumn[]; grid: string; selectableGrid: string }> = {
  ledger: {
    columns: [DATE, NAME, CATEGORY, ACCOUNT, KIND, AMOUNT, ACTION],
    grid: 'grid-cols-[1fr_auto_2.25rem] lg:grid-cols-[3.25rem_1.6fr_1fr_1fr_8.5rem_7.5rem_2.25rem]',
    selectableGrid: 'grid-cols-[1rem_1fr_auto_2.25rem] lg:grid-cols-[1rem_3.25rem_1.6fr_1fr_1fr_8.5rem_7.5rem_2.25rem]',
  },
  review: {
    columns: [DATE, NAME, CATEGORY, KIND, AMOUNT, ACTION],
    grid: 'grid-cols-[1fr_auto_2.25rem] lg:grid-cols-[3.25rem_1.6fr_1fr_8.5rem_7.5rem_2.25rem]',
    selectableGrid: 'grid-cols-[1rem_1fr_auto_2.25rem] lg:grid-cols-[1rem_3.25rem_1.6fr_1fr_8.5rem_7.5rem_2.25rem]',
  },
};

/** The column template a line's row uses, so its cells sit under the header row's names. */
export function lineGrid(variant: LineVariant, selectable = false): string {
  return selectable ? LAYOUTS[variant].selectableGrid : LAYOUTS[variant].grid;
}

/**
 * Whether the checkbox column is drawn: the list is selectable and the boxes are not hidden.
 * They are hidden only on a touch screen before "Selecionar". Rows and the header both ask
 * this, so they always agree on the columns.
 */
export function useCheckboxColumn(selectable: boolean): boolean {
  const columnShown = useSelectColumn();
  return selectable && columnShown;
}

/** `lineGrid` for a row inside a list: the checkbox column is left out while the boxes are hidden. */
export function useLineGrid(variant: LineVariant, selectable = false): string {
  return lineGrid(variant, useCheckboxColumn(selectable));
}

/** How the header's "select all shown" box reads, and what pressing it does. */
export type HeaderSelection = { checked: boolean | 'indeterminate'; onChange: (checked: boolean) => void };

/**
 * The list that holds line rows, with the header row that names their columns. Pass `selectable`
 * when the rows carry a checkbox (`LineRow`'s `selection`), so the header gets its narrow first column too.
 * Pass `headerSelection` to put a "select all shown" box in that column.
 */
export function LineDataList({
  label,
  variant,
  selectable = false,
  headerSelection,
  children,
}: {
  label: string;
  variant: LineVariant;
  selectable?: boolean;
  headerSelection?: HeaderSelection;
  children: ReactNode;
}) {
  const { columns } = LAYOUTS[variant];
  const withCheckbox = useCheckboxColumn(selectable);
  const select: DataColumn = headerSelection
    ? {
        ...SELECT,
        control: (
          <SelectCell label="Selecionar todos os lançamentos mostrados" checked={headerSelection.checked} onChange={headerSelection.onChange} />
        ),
      }
    : SELECT;
  return (
    <DataList label={label} columns={withCheckbox ? [select, ...columns] : columns} grid={lineGrid(variant, withCheckbox)}>
      {children}
    </DataList>
  );
}
