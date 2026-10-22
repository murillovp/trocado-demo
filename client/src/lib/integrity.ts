import type { IntegrityCheckKey } from '@/api/types';

/** One sentence for each rule, with the count in front. A new check without a sentence fails the type check. */
const SENTENCES: Record<IntegrityCheckKey, (count: number) => string> = {
  pair_incomplete: (count) =>
    count === 1
      ? '1 par de transferência não tem exatamente duas metades.'
      : `${count} pares de transferência não têm exatamente duas metades.`,
  pair_mismatch: (count) =>
    count === 1
      ? '1 par de transferência tem metades que não combinam.'
      : `${count} pares de transferência têm metades que não combinam.`,
  pair_on_non_transfer: (count) =>
    count === 1
      ? '1 lançamento tem um par de transferência, mas não é Fora dos totais.'
      : `${count} lançamentos têm um par de transferência, mas não são Fora dos totais.`,
  date_invalid: (count) =>
    count === 1 ? '1 lançamento tem uma data que não existe.' : `${count} lançamentos têm uma data que não existe.`,
  adjusted_amount_invalid: (count) =>
    count === 1
      ? '1 lançamento tem um valor ajustado inválido.'
      : `${count} lançamentos têm um valor ajustado inválido.`,
  import_rows_mismatch: (count) =>
    count === 1
      ? '1 importação não confere com as linhas lidas do arquivo.'
      : `${count} importações não conferem com as linhas lidas do arquivo.`,
  import_row_missing_line: (count) =>
    count === 1
      ? '1 linha lida de um arquivo aponta para um lançamento que não existe.'
      : `${count} linhas lidas de arquivos apontam para lançamentos que não existem.`,
  hand_added_sign: (count) =>
    count === 1
      ? '1 lançamento feito à mão tem o sinal errado para o tipo.'
      : `${count} lançamentos feitos à mão têm o sinal errado para o tipo.`,
  category_wrong_direction: (count) =>
    count === 1
      ? '1 lançamento tem uma categoria do tipo errado.'
      : `${count} lançamentos têm uma categoria do tipo errado.`,
  transfer_with_category: (count) =>
    count === 1
      ? '1 lançamento Fora dos totais tem categoria.'
      : `${count} lançamentos Fora dos totais têm categoria.`,
  imported_income_negative: (count) =>
    count === 1
      ? '1 lançamento importado em que o dinheiro saiu está como Entrada.'
      : `${count} lançamentos importados em que o dinheiro saiu estão como Entrada.`,
  expense_in_savings_category: (count) =>
    count === 1 ? '1 gasto está numa categoria de poupança.' : `${count} gastos estão numa categoria de poupança.`,
  savings_outside_savings_category: (count) =>
    count === 1
      ? '1 lançamento de poupança está numa categoria de outro grupo.'
      : `${count} lançamentos de poupança estão numa categoria de outro grupo.`,
};

export function integritySentence(check: IntegrityCheckKey, count: number): string {
  return SENTENCES[check](count);
}
