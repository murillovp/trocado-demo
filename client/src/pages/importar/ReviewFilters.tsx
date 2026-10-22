import type { ReactNode } from 'react';
import { Segmented } from '@/components/Segmented';
import { KIND_LABEL } from '@/lib/labels';

export type ReviewFilter = 'review' | 'all' | 'transfers';

type Props = {
  active: ReviewFilter;
  flaggedCount: number;
  lineCount: number;
  onChange: (filter: ReviewFilter) => void;
  /** The "Selecionar" / "Cancelar" button of a touch screen, shown beside the choice. Left out with a pointer. */
  selectToggle?: ReactNode;
};

/** The choice between the lines that need a look, every line, and the ones kept out of the totals. */
export function ReviewFilters({ active, flaggedCount, lineCount, onChange, selectToggle }: Props) {
  const options: { value: ReviewFilter; label: string }[] = [
    { value: 'review', label: `Para revisar · ${flaggedCount}` },
    { value: 'all', label: `Todos · ${lineCount}` },
    { value: 'transfers', label: KIND_LABEL.transfer },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented label="Filtrar lançamentos" value={active} options={options} onChange={onChange} />
      {selectToggle}
    </div>
  );
}
