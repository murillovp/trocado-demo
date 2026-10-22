import { useState } from 'react';
import { toast } from 'sonner';
import { createTransaction } from '@/api/endpoints';
import { useAccounts, useCategories, useChange } from '@/api/queries';
import type { ManualLineInput, Person } from '@/api/types';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Field } from '@/components/Field';
import { KindSelect } from '@/components/KindSelect';
import { NativeSelect } from '@/components/NativeSelect';
import { Notice } from '@/components/Notice';
import { ErrorState, LoadingState } from '@/components/States';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { todayIso } from '@/lib/format';
import { categoriesForKind } from '@/lib/lines';
import { latestDate, MIN_DATE, NAME_MAX_LENGTH, TEXT_MAX_LENGTH } from '../../../../shared/limits';
import { kindWithCategory } from '../../../../shared/savings';
import { buildManualLine, defaultDate, type ManualLineErrors, type ManualLineForm } from './manualLine';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  /** The person on screen, or undefined for Casa. */
  defaultPersonId?: string;
  month: string;
};

export function AddLineDialog({ open, onOpenChange, people, defaultPersonId, month }: Props) {
  const accountsQuery = useAccounts();
  const categoriesQuery = useCategories();
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const ready = accountsQuery.isSuccess && categoriesQuery.isSuccess;
  const [personId, setPersonId] = useState(defaultPersonId ?? people[0]?.id ?? '');
  const [form, setForm] = useState<ManualLineForm>(() => ({
    accountId: '',
    date: defaultDate(month),
    amount: '',
    kind: 'expense',
    description: '',
    categoryId: '',
    savingsLabel: '',
    note: '',
  }));
  const [errors, setErrors] = useState<ManualLineErrors>({});

  const personAccounts = accounts.filter((account) => account.personId === personId);
  const accountId = personAccounts.some((account) => account.id === form.accountId)
    ? form.accountId
    : (personAccounts[0]?.id ?? '');
  const choices = categoriesForKind(categories, form.kind);

  const add = useChange((input: ManualLineInput) => createTransaction(input), {
    onSuccess: () => {
      toast.success('Lançamento adicionado.');
      onOpenChange(false);
    },
  });

  /** Edits form fields and drops the errors that named them, so a fixed field stops looking wrong. */
  function change(changes: Partial<ManualLineForm>) {
    setForm({ ...form, ...changes });
    dropErrors(...(Object.keys(changes) as (keyof ManualLineErrors)[]));
  }

  /** Forgets the errors of these fields and the server's last refusal. */
  function dropErrors(...fields: (keyof ManualLineErrors)[]) {
    setErrors(Object.fromEntries(Object.entries(errors).filter(([field]) => !fields.includes(field as keyof ManualLineErrors))));
    add.reset();
  }

  function submit() {
    const result = buildManualLine({ ...form, accountId });
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    add.mutate(result.input);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar lançamento</DialogTitle>
          <DialogDescription>Para o que não passou pelo banco, como dinheiro vivo.</DialogDescription>
        </DialogHeader>
        {accountsQuery.isError ? (
          <ErrorState error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} />
        ) : categoriesQuery.isError ? (
          <ErrorState error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} />
        ) : !ready ? (
          <LoadingState />
        ) : (
          <>
            <form
              id="add-line"
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <Field label="Pessoa">
                <NativeSelect value={personId} onChange={(event) => {
                    setPersonId(event.target.value);
                    dropErrors('accountId');
                  }}>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Conta" error={errors.accountId}>
                <NativeSelect value={accountId} onChange={(event) => change({ accountId: event.target.value })}>
                  {personAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.label}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Data" error={errors.date}>
                <Input type="date" min={MIN_DATE} max={latestDate(todayIso())} value={form.date} onChange={(event) => change({ date: event.target.value })} />
              </Field>
              <Field label="Valor" error={errors.amount}>
                <Input inputMode="decimal" placeholder="45,90" value={form.amount} onChange={(event) => change({ amount: event.target.value })} />
              </Field>
              <Field label="Tipo">
                <KindSelect
                  value={form.kind}
                  only={['expense', 'income', 'savings']}
                  onChange={(kind) => change({ kind: kind as ManualLineForm['kind'], categoryId: '' })}
                />
              </Field>
              <Field label="O que foi" error={errors.description}>
                <Input maxLength={TEXT_MAX_LENGTH} value={form.description} onChange={(event) => change({ description: event.target.value })} />
              </Field>
              <Field label="Categoria">
                <CategoryPicker
                  label="Categoria"
                  value={form.categoryId}
                  options={[{ id: '', name: 'Sem categoria' }, ...choices]}
                  onChange={(id) => {
                    const bucket = categories.find((category) => category.id === id)?.bucket;
                    change({ categoryId: id, kind: kindWithCategory(form.kind, bucket) as ManualLineForm['kind'] });
                  }}
                />
              </Field>
              {form.kind === 'savings' ? (
                <Field label="Rótulo da poupança">
                  <Input maxLength={NAME_MAX_LENGTH} placeholder="Cripto, Wise USD" value={form.savingsLabel} onChange={(event) => change({ savingsLabel: event.target.value })} />
                </Field>
              ) : null}
              <div className="sm:col-span-2">
                <Field label="Observação">
                  <Input maxLength={TEXT_MAX_LENGTH} value={form.note} onChange={(event) => change({ note: event.target.value })} />
                </Field>
              </div>
            </form>
            {/* The toast says it too; this stays in view while the dialog is open. */}
            {add.isError ? (
              <Notice tone="error" role="alert">
                {add.error.message}
              </Notice>
            ) : null}
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="add-line" loading={add.isPending}>
                Adicionar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
