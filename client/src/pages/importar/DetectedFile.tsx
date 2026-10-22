import type { Account, FileDetection, Person } from '@/api/types';
import { Field } from '@/components/Field';
import { NativeSelect } from '@/components/NativeSelect';
import { TextLink } from '@/components/TextLink';
import { plural } from '@/lib/format';
import { FORMAT_LABEL } from '@/lib/labels';
import type { Picked } from './useUploadFlow';

type Props = {
  detection: FileDetection;
  picked: Picked[];
  people: Person[];
  accounts: Account[];
  accountId: string;
  onAccountChange: (accountId: string) => void;
  /** When the accounts did not load, the account choice is left out: the error above it says why. */
  accountsFailed: boolean;
};

/** What the server said the file is, and the account it goes to (the first fitting one is proposed). */
export function DetectedFile({ detection, picked, people, accounts, accountId, onAccountChange, accountsFailed }: Props) {
  const fitting = accounts.filter((account) => detection.accountIds.includes(account.id));
  const isSwile = detection.format === 'swile_screenshots';

  return (
    <div className="flex flex-col gap-3">
      {isSwile ? (
        <div className="text-sm">
          <p className="font-medium">{plural(picked.length, 'captura', 'capturas')} do extrato Swile</p>
          {picked.map((item, index) => (
            <p key={`${index}-${item.file.name}`} className="text-muted-foreground">
              {item.file.name}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm">
          Formato: <span className="font-medium">{FORMAT_LABEL[detection.format]}</span>
        </p>
      )}
      {accountsFailed ? null : fitting.length === 0 ? (
        <p role="alert" className="text-sm text-destructive">
          Nenhuma conta cadastrada aceita {FORMAT_LABEL[detection.format]}. Adicione uma conta em{' '}
          <TextLink to="/configuracoes/pessoas">Pessoas e contas</TextLink>.
        </p>
      ) : (
        <Field label="Conta" hint="O Trocado escolheu a conta pelo formato do arquivo. Troque se estiver errado.">
          <NativeSelect value={accountId} onChange={(event) => onAccountChange(event.target.value)}>
            {people.map((person) => {
              const own = fitting.filter((account) => account.personId === person.id);
              return own.length === 0 ? null : (
                <optgroup key={person.id} label={person.name}>
                  {own.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </NativeSelect>
        </Field>
      )}
    </div>
  );
}
