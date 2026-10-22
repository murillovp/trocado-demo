import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatReais } from '@/lib/format';

type Props = {
  /** The amount the seller rule will be tied to, with or without its sign. */
  amountCents: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * "Só para este valor": the box on an imported line that ties what the person
 * just chose to this exact amount. Unticked, the choice holds for every line of
 * the seller, and a sentence under the box says so. Used by the Transações editor
 * and the review row.
 */
export function RememberAmountCheckbox({ amountCents, checked, onChange }: Props) {
  const hintId = useId();
  return (
    <div className="flex flex-col">
      <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-6">
        <Checkbox checked={checked} aria-describedby={hintId} onCheckedChange={(next) => onChange(next === true)} />
        Só para este valor ({formatReais(amountCents)})
      </label>
      <span id={hintId} className="text-xs text-muted-foreground">
        Sem marcar, vale para todos os lançamentos deste fornecedor.
      </span>
    </div>
  );
}
