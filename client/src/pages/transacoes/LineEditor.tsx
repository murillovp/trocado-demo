import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTransaction, updateTransaction } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import type { Category, LedgerLine, LedgerLineChanges, Tag } from '@/api/types';
import { AcceptSuggestion } from '@/components/AcceptSuggestion';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Field } from '@/components/Field';
import { KindSelect } from '@/components/KindSelect';
import { RememberAmountCheckbox } from '@/components/RememberAmountCheckbox';
import { TagPicker } from '@/components/TagPicker';
import { UnsavedAsk } from '@/components/UnsavedAsk';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NAME_MAX_LENGTH, TEXT_MAX_LENGTH } from '../../../../shared/limits';
import { formatCentavos } from '../../../../shared/money';
import { kindWithCategory } from '../../../../shared/savings';
import { formatReais } from '@/lib/format';
import { TRANSFER_HINT } from '@/lib/labels';
import { amountChange, categoryOptions, diffLine, displayName, draftOf, partnerSentence, savedLineMessage, withCategory, withKind } from '@/lib/lines';
import { isRefund, REFUND_HINT } from '@/lib/refund';
import { useReportDirty, type UnsavedGuard } from '@/lib/useOpenRow';
import { useScrollIntoViewWhen } from '@/lib/useScrollIntoViewWhen';
import { isSuggestedLine } from '@/lib/vendors';

type Props = {
  line: LedgerLine;
  categories: Category[];
  /** Closes the editor after a save, with no question. */
  onDone: () => void;
  /** Lets the page ask before the editor closes with changes that are not saved. */
  guard: UnsavedGuard;
};

/** The checkbox that carries a category change to the seller's other lines ("Mudar também os outros 12 lançamentos de iFood"). */
function spreadLabel(count: number, sellerName: string): string {
  return count === 1 ? `Mudar também o outro lançamento de ${sellerName}` : `Mudar também os outros ${count} lançamentos de ${sellerName}`;
}

/** True when both lists hold the same tags, in any order. */
function sameTagIds(left: Tag[], right: Tag[]): boolean {
  return left.length === right.length && left.every((tag) => right.some((other) => other.id === tag.id));
}

/** Edits one line on Transações. The same rules as the review screen apply on the server. */
export function LineEditor({ line, categories, onDone, guard }: Props) {
  // The editor opens under its row, which on a phone can be below the fold or under the bottom bar.
  const formRef = useScrollIntoViewWhen<HTMLFormElement>(true);
  const [draft, setDraft] = useState(() => draftOf(line));
  const changes = diffLine(line, draft);
  const [amountText, setAmountText] = useState(() => formatCentavos(Math.abs(line.amountCents)));
  const [amountError, setAmountError] = useState<string | null>(null);
  const amount = amountChange(line, amountText);
  // `?? []`: a server older than this client sends no tags, and then the field stays hidden.
  const tagsKnown = line.tags != null;
  const [tags, setTags] = useState<Tag[]>(() => line.tags ?? []);
  const tagsChanged = !sameTagIds(tags, line.tags ?? []);
  const patch: LedgerLineChanges | null =
    changes || amount.amountCents !== undefined || tagsChanged
      ? {
          ...(changes ?? {}),
          ...(amount.amountCents !== undefined ? { amountCents: amount.amountCents } : {}),
          ...(tagsChanged ? { tagIds: tags.map((tag) => tag.id) } : {}),
        }
      : null;
  const options = categoryOptions(categories, draft.kind, line);

  // Offered only when the user picked a real category that differs from the saved one. A change of
  // kind alone never spreads: it clears the category, and that is not a correction to carry over.
  // The kind may differ only when the category's group decided it (ADR-0012). `!= null`: a server
  // older than this client sends no count. A rule for one amount has no other lines to speak for,
  // so "Só para este valor" hides it.
  const [spreadOn, setSpreadOn] = useState(true);
  const pickedCategory = draft.categoryId !== null && draft.categoryId !== line.categoryId;
  const kindFollowsCategory = draft.kind === kindWithCategory(line.kind, categories.find((category) => category.id === draft.categoryId)?.bucket);
  const canSpread =
    pickedCategory && kindFollowsCategory && !draft.rememberAmount && line.sameVendorCategoryCount != null && line.sameVendorCategoryCount > 0;
  const sellerName = displayName(line);
  /** Adds the spread choice to a save. */
  const withSpread = (body: LedgerLineChanges): LedgerLineChanges => (canSpread && spreadOn ? { ...body, applyToVendorLines: true } : body);

  const save = useChange(
    (body: LedgerLineChanges) => updateTransaction(line.id, body),
    {
      onSuccess: (result, sent) => {
        toast.success(savedLineMessage(line, sent, categories, result.vendorLinesMoved));
        onDone();
      },
    },
  );

  // A save in flight still holds the draft: another row waits for it, and if it fails the draft is still here to ask about.
  useReportDirty(patch !== null || amount.error !== undefined, save.isPending, guard);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const remove = useChange(() => deleteTransaction(line.id), {
    onSuccess: () => {
      toast.success('Lançamento apagado.');
      onDone();
    },
  });

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-4 border-t bg-muted/30 px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (amount.error) {
          setAmountError(amount.error);
          return;
        }
        if (patch) save.mutate(withSpread(patch));
      }}
    >
      {/* `vendorId != null`: a server older than this client sends no seller id. */}
      {isSuggestedLine(line) && line.vendorId != null ? <AcceptSuggestion vendorId={line.vendorId} /> : null}

      <div className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-muted-foreground">Texto do banco</span>
        <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{line.rawDescription}</code>
      </div>

      {line.transferPartner ? (
        <p className="text-sm">
          {partnerSentence(line.transferPartner, line.amountCents)} Mudar o tipo desfaz o par nas duas pontas.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {line.isManual ? null : (
          <Field label="Apelido">
            <Input maxLength={NAME_MAX_LENGTH} value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} />
          </Field>
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Field label="Tipo">
            <KindSelect
              value={draft.kind}
              line={line}
              imported={!line.isManual}
              emptyLabel={line.kind === null ? 'Sem tipo' : undefined}
              onChange={(kind) => setDraft(withKind(draft, kind, categories))}
            />
          </Field>
          {draft.kind === 'transfer' ? <p className="text-xs text-muted-foreground">{TRANSFER_HINT}</p> : null}
          {isRefund({ kind: draft.kind, amountCents: line.amountCents }) ? <p className="text-xs text-muted-foreground">{REFUND_HINT}</p> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Field label="Valor" error={amountError}>
            <Input
              inputMode="decimal"
              value={amountText}
              onChange={(event) => {
                setAmountText(event.target.value);
                setAmountError(null);
              }}
            />
          </Field>
          {line.bankAmountCents != null ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>No banco: {formatReais(Math.abs(line.bankAmountCents))}</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                disabled={save.isPending}
                onClick={() => save.mutate(withSpread({ ...(changes ?? {}), amountCents: null }))}
              >
                Voltar ao valor do banco
              </Button>
            </div>
          ) : null}
        </div>
        <Field label="Categoria">
          <CategoryPicker
            label="Categoria"
            value={draft.categoryId ?? ''}
            disabled={options.length === 0}
            options={[{ id: '', name: 'Sem categoria' }, ...options]}
            onChange={(id) => setDraft(withCategory(draft, id || null, categories))}
          />
        </Field>
        {draft.kind === 'savings' ? (
          <Field label="Rótulo da poupança">
            <Input
              maxLength={NAME_MAX_LENGTH}
              placeholder="Cripto, Wise USD"
              value={draft.savingsLabel}
              onChange={(event) => setDraft({ ...draft, savingsLabel: event.target.value })}
            />
          </Field>
        ) : null}
        <Field label="Observação">
          <Input maxLength={TEXT_MAX_LENGTH} value={draft.note ?? ''} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
        </Field>
      </div>

      {tagsKnown ? <TagPicker value={tags} onChange={setTags} disabled={save.isPending} /> : null}

      {line.isManual ? null : (
        <RememberAmountCheckbox
          amountCents={line.bankAmountCents ?? line.amountCents}
          checked={draft.rememberAmount}
          onChange={(rememberAmount) => setDraft({ ...draft, rememberAmount })}
        />
      )}

      {canSpread ? (
        <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-6">
          <Checkbox checked={spreadOn} onCheckedChange={(next) => setSpreadOn(next === true)} />
          {spreadLabel(line.sameVendorCategoryCount, sellerName)}
        </label>
      ) : null}

      {guard.asking ? (
        <UnsavedAsk onDiscard={guard.onDiscard} onKeepEditing={guard.onKeepEditing} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={save.isPending} disabled={!patch && !amount.error}>
            Salvar
          </Button>
          <Button type="button" variant="ghost" onClick={guard.onRequestClose}>
            Fechar
          </Button>
          {line.isManual ? (
            confirmingDelete ? (
              <span className="ml-auto flex items-center gap-2 text-sm">
                Apagar mesmo?
                <Button type="button" variant="destructive" size="sm" loading={remove.isPending} onClick={() => remove.mutate(undefined)}>
                  Sim, apagar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Não
                </Button>
              </span>
            ) : (
              <Button type="button" variant="ghost" className="ml-auto text-destructive" onClick={() => setConfirmingDelete(true)}>
                Apagar lançamento
              </Button>
            )
          ) : (
            <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto sm:max-w-xs">
              Linhas de importação não se apagam. Para tirar do total, mude o tipo para Fora dos totais.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
