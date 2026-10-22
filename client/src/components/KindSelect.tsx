import type { ComponentProps } from 'react';
import type { TransactionKind } from '@/api/types';
import { NativeSelect } from '@/components/NativeSelect';
import { KIND_LABEL } from '@/lib/labels';
import { kindChoices } from '@/lib/lines';

type Props = Omit<ComponentProps<typeof NativeSelect>, 'value' | 'onChange' | 'children'> & {
  /** The kind chosen now (the draft), or null for none. */
  value: TransactionKind | null;
  onChange: (kind: TransactionKind | null) => void;
  /**
   * The line as saved: its amount and kind. They decide whether Entrada is offered
   * (ADR-0013). Leave out for a seller's default type, which has no amount.
   */
  line?: { amountCents: number; kind: TransactionKind | null };
  /** True for a line that came from a file, whose sign is the bank's. */
  imported?: boolean;
  /** Text of the choice that means "no kind" ("Sem tipo", "Nenhum"). Without it there is no such choice. */
  emptyLabel?: string;
  /** Offers only these kinds, for a hand-added line that cannot be Fora dos totais. */
  only?: TransactionKind[];
};

/**
 * The "Tipo" select every edit form shares. It offers `kindChoices`, so it never
 * shows Entrada for imported money that left (plan 11's rule), and it turns the
 * browser's text value back into a kind.
 */
export function KindSelect({ value, onChange, line, imported = false, emptyLabel, only, ...props }: Props) {
  const choices = kindChoices(line ?? { amountCents: 0, kind: value }, imported).filter(
    (kind) => !only || only.includes(kind),
  );
  return (
    <NativeSelect
      value={value ?? ''}
      onChange={(event) => onChange((event.target.value || null) as TransactionKind | null)}
      {...props}
    >
      {emptyLabel ? <option value="">{emptyLabel}</option> : null}
      {choices.map((kind) => (
        <option key={kind} value={kind}>
          {KIND_LABEL[kind]}
        </option>
      ))}
    </NativeSelect>
  );
}
