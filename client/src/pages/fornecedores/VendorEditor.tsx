import { useState } from 'react';
import { toast } from 'sonner';
import { updateVendor } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import type { Category, VendorEdit, VendorSummary } from '@/api/types';
import { AcceptSuggestion } from '@/components/AcceptSuggestion';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Field } from '@/components/Field';
import { KindSelect } from '@/components/KindSelect';
import { UnsavedAsk } from '@/components/UnsavedAsk';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NAME_MAX_LENGTH, TEXT_MAX_LENGTH } from '../../../../shared/limits';
import { plural } from '@/lib/format';
import { TRANSFER_HINT } from '@/lib/labels';
import { useReportDirty, type UnsavedGuard } from '@/lib/useOpenRow';
import { diffVendor, isSuggested, vendorCategoryOptions, vendorDraftOf, withVendorCategory, withVendorKind } from '@/lib/vendors';

type Props = {
  vendor: VendorSummary;
  categories: Category[];
  /** Closes the editor after a save, with no question. */
  onDone: () => void;
  /** Lets the page ask before the editor closes with changes that are not saved. */
  guard: UnsavedGuard;
};

export function VendorEditor({ vendor, categories, onDone, guard }: Props) {
  const [draft, setDraft] = useState(() => vendorDraftOf(vendor));
  const [error, setError] = useState<string | null>(null);
  const categoryChanged = draft.defaultCategoryId !== vendor.defaultCategoryId;
  const options = vendorCategoryOptions(categories, draft.defaultKind, vendor);

  const save = useChange(
    (edit: VendorEdit) => updateVendor(vendor.id, edit),
    {
      onSuccess: (result) => {
        const moved =
          result.linesUpdated > 0
            ? ` ${plural(result.linesUpdated, 'lançamento mudou', 'lançamentos mudaram')} de categoria.`
            : '';
        // Lines of another type than the new category fits stay as they were, and so do imported lines
        // where money left when the seller is Entrada (ADR-0013).
        const skipped = result.linesSkipped
          ? ` ${plural(result.linesSkipped, 'lançamento de outro tipo ficou como estava', 'lançamentos de outro tipo ficaram como estavam')}.`
          : '';
        toast.success(`Fornecedor salvo.${moved}${skipped}`);
        onDone();
      },
    },
  );

  // A save in flight still holds the draft: another row waits for it, and if it fails the draft is still here to ask about.
  const diff = diffVendor(vendor, draft);
  useReportDirty('error' in diff || diff.edit !== null, save.isPending, guard);

  /** Any edit clears the message, which can name any of the fields. */
  function changeDraft(next: typeof draft) {
    setDraft(next);
    setError(null);
  }

  function submit() {
    const result = diffVendor(vendor, draft);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    if (result.edit) save.mutate(result.edit);
    else onDone();
  }

  return (
    <form
      className="flex flex-col gap-4 border-t bg-muted/30 px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {isSuggested(vendor) ? <AcceptSuggestion vendorId={vendor.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Apelido">
          <Input maxLength={NAME_MAX_LENGTH} value={draft.nickname} onChange={(event) => changeDraft({ ...draft, nickname: event.target.value })} />
        </Field>
        <Field label="Nome no extrato">
          <Input maxLength={TEXT_MAX_LENGTH} value={draft.matchName} onChange={(event) => changeDraft({ ...draft, matchName: event.target.value })} />
        </Field>
        <Field label="Só com este valor" hint="Como no extrato. Vazio vale para qualquer valor.">
          <Input placeholder="qualquer valor" value={draft.amount} onChange={(event) => changeDraft({ ...draft, amount: event.target.value })} />
        </Field>
        <Field label="Categoria padrão">
          <CategoryPicker
            label="Categoria padrão"
            value={draft.defaultCategoryId ?? ''}
            options={[{ id: '', name: 'Sem categoria' }, ...options]}
            onChange={(id) => changeDraft(withVendorCategory(draft, id || null, categories))}
          />
        </Field>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Field label="Tipo padrão">
            <KindSelect
              value={draft.defaultKind}
              emptyLabel="Nenhum"
              onChange={(kind) => changeDraft(withVendorKind(draft, kind, categories))}
            />
          </Field>
          {draft.defaultKind === 'transfer' ? <p className="text-xs text-muted-foreground">{TRANSFER_HINT}</p> : null}
        </div>
      </div>

      {categoryChanged ? (
        <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-6">
          <Checkbox checked={draft.applyToLines} onCheckedChange={(next) => changeDraft({ ...draft, applyToLines: next === true })} />
          Mudar também os lançamentos antigos que ainda estão em {vendor.defaultCategoryName ?? 'sem categoria'}
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {guard.asking ? (
        <UnsavedAsk onDiscard={guard.onDiscard} onKeepEditing={guard.onKeepEditing} />
      ) : (
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Salvar
          </Button>
          <Button type="button" variant="ghost" onClick={guard.onRequestClose}>
            Fechar
          </Button>
        </div>
      )}
    </form>
  );
}
