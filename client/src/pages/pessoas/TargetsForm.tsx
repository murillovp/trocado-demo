import { useState } from 'react';
import { toast } from 'sonner';
import { updatePerson } from '@/api/endpoints';
import { useBucketLabels, useChange } from '@/api/queries';
import type { Person, PersonPatch } from '@/api/types';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatReais } from '@/lib/format';
import { diffPerson, personFormOf, targetAmounts, targetsSum, type PersonForm, type PersonFormErrors } from './personForm';

/**
 * One person's three targets and reference income, with its validation and save. Pessoas e contas
 * and Orçamento both render it, so a target is changed the same way on both. The save reloads every
 * query, which refreshes the budget numbers on screen. `onSaved` and `onCancel` let a screen that
 * opens the form on demand close it; with `onCancel` the form shows a Cancelar button.
 */
export function TargetsForm({ person, onSaved, onCancel }: { person: Person; onSaved?: () => void; onCancel?: () => void }) {
  const labels = useBucketLabels();
  const [form, setForm] = useState(() => personFormOf(person));
  const [errors, setErrors] = useState<PersonFormErrors>({});
  const sum = targetsSum(form);
  const amounts = targetAmounts(form);
  // Unreadable boxes count as a change, so Salvar metas can show what is wrong with them.
  const diff = diffPerson(person, form);
  const changed = 'errors' in diff || diff.patch !== null;

  const save = useChange((patch: PersonPatch) => updatePerson(person.id, patch), {
    onSuccess: () => {
      toast.success(`Metas de ${person.name} salvas.`);
      onSaved?.();
    },
  });

  /** Types into one box and drops that box's error, which no longer describes what is there. */
  function change(field: keyof PersonForm, value: string) {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: undefined });
  }

  function submit() {
    const result = diffPerson(person, form);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (result.patch) save.mutate(result.patch);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* Three shared rows (label, box, amount), so the boxes line up when a group name wraps to several lines. */}
      <div className="grid grid-cols-3 grid-rows-[auto_auto_auto] gap-x-3">
        <Field alignRows label={`${labels.needs} (%)`} error={errors.needs} hint={amounts?.needs != null ? formatReais(amounts.needs) : undefined}>
          <Input inputMode="numeric" value={form.needs} onChange={(event) => change('needs', event.target.value)} />
        </Field>
        <Field alignRows label={`${labels.wants} (%)`} error={errors.wants} hint={amounts?.wants != null ? formatReais(amounts.wants) : undefined}>
          <Input inputMode="numeric" value={form.wants} onChange={(event) => change('wants', event.target.value)} />
        </Field>
        <Field alignRows label={`${labels.savings} (%)`} error={errors.savings} hint={amounts?.savings != null ? formatReais(amounts.savings) : undefined}>
          <Input inputMode="numeric" value={form.savings} onChange={(event) => change('savings', event.target.value)} />
        </Field>
      </div>
      {sum !== null ? (
        <p className="text-xs text-muted-foreground">{sum === 100 ? 'Somam 100%.' : `Somam ${sum}%. O normal é somar 100%.`}</p>
      ) : null}
      <Field label="Renda de referência" hint="Deixe vazio para medir contra as entradas de cada mês." error={errors.income}>
        <Input inputMode="decimal" placeholder="8.000,00" value={form.income} onChange={(event) => change('income', event.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={save.isPending} disabled={!changed}>
          Salvar metas de {person.name}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
