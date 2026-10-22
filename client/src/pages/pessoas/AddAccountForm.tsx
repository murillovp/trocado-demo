import { useState } from 'react';
import { toast } from 'sonner';
import { createAccount } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import type { AccountType, BankId, NewAccount, Person } from '@/api/types';
import { Field } from '@/components/Field';
import { NativeSelect } from '@/components/NativeSelect';
import { SectionCard } from '@/components/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACCOUNT_TYPE_LABEL, BANK_LABEL } from '@/lib/labels';
import { NAME_MAX_LENGTH } from '../../../../shared/limits';

/** The Pessoas e contas "Adicionar conta" form. Swile is the account behind every screenshot import (spec 6). */
export function AddAccountForm({
  people,
  onCancel,
  onCreated,
}: {
  people: Person[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? '');
  const [bank, setBank] = useState<BankId>('nubank');
  const [type, setType] = useState<AccountType>('checking');
  const [label, setLabel] = useState('');

  const create = useChange((input: NewAccount) => createAccount(input), {
    onSuccess: () => {
      toast.success('Conta adicionada.');
      onCreated();
    },
  });

  function chooseBank(next: BankId) {
    setBank(next);
    if (next === 'swile') {
      setType('benefit');
      setLabel((current) => (current.trim() === '' ? 'Swile Premiação' : current));
    }
  }

  return (
    <SectionCard>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = label.trim();
          if (!trimmed || !personId) return;
          create.mutate({ personId, bank, type, label: trimmed });
        }}
      >
        <div className="w-full sm:w-48">
          <Field label="Pessoa">
            <NativeSelect value={personId} onChange={(event) => setPersonId(event.target.value)}>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="w-full sm:w-36">
          <Field label="Banco">
            <NativeSelect value={bank} onChange={(event) => chooseBank(event.target.value as BankId)}>
              {Object.entries(BANK_LABEL).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="w-full sm:w-40">
          <Field label="Tipo">
            <NativeSelect value={type} onChange={(event) => setType(event.target.value as AccountType)}>
              {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="w-full sm:w-56">
          <Field label="Nome da conta">
            <Input autoFocus maxLength={NAME_MAX_LENGTH} value={label} onChange={(event) => setLabel(event.target.value)} />
          </Field>
        </div>
        <Button type="submit" loading={create.isPending} disabled={label.trim() === '' || !personId}>
          Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </form>
    </SectionCard>
  );
}
