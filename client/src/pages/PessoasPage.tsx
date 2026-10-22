import type { UseQueryResult } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { renameAccount } from '@/api/endpoints';
import { useAccounts, useChange, useImports, usePeople } from '@/api/queries';
import type { Account, ImportHistoryEntry, Person } from '@/api/types';
import { DataCell, DataList, type DataColumn } from '@/components/DataList';
import { PersonDisc } from '@/components/PersonDisc';
import { RenameButton, RenameForm } from '@/components/RenameField';
import { SectionHeader } from '@/components/SectionCard';
import { PageHeader } from '@/components/PageHeader';
import { QueryView } from '@/components/QueryView';
import { ErrorState } from '@/components/States';
import { Button } from '@/components/ui/button';
import { personColor } from '@/lib/colors';
import { formatTimestamp } from '@/lib/format';
import { ACCOUNT_TYPE_LABEL, accountFileLabel, BANK_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { NAME_MAX_LENGTH } from '../../../shared/limits';
import { AddAccountForm } from './pessoas/AddAccountForm';
import { PersonCard } from './pessoas/PersonCard';

const ACCOUNT_COLUMNS: DataColumn[] = [
  { key: 'label', label: 'Conta' },
  { key: 'bank', label: 'Banco' },
  { key: 'type', label: 'Tipo' },
  { key: 'owner', label: 'Dono' },
  { key: 'format', label: 'Formato do arquivo' },
  { key: 'lastImport', label: 'Última importação' },
  { key: 'action', label: '' },
];
const ACCOUNT_GRID = 'grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_1fr_1fr_1.2fr_1.4fr_2.25rem]';

export function PessoasPage() {
  const people = usePeople();
  const accounts = useAccounts();
  const imports = useImports();

  const header = (
    <PageHeader
      eyebrow="Configurações"
      title="Pessoas e contas"
      intro="As metas do 50/30/20 são de cada pessoa, não da casa. A renda de referência existe porque salário cai em dias diferentes e faria as porcentagens pularem sem motivo."
    />
  );

  return (
    <QueryView query={people} header={header} className="contents">
      {(everyone) => (
        <QueryView query={accounts} className="contents">
          {(accountList) => <PeopleAndAccounts people={everyone} accounts={accountList} imports={imports} />}
        </QueryView>
      )}
    </QueryView>
  );
}

function PeopleAndAccounts({
  people,
  accounts,
  imports,
}: {
  people: Person[];
  accounts: Account[];
  imports: UseQueryResult<ImportHistoryEntry[], Error>;
}) {
  const [addingAccount, setAddingAccount] = useState(false);

  const importList = imports.data ?? [];
  const importsError = imports.isError ? <ErrorState inline error={imports.error} onRetry={() => void imports.refetch()} /> : null;
  const lastImport = (accountId: string) =>
    importList
      .filter((entry) => entry.accountId === accountId)
      .map((entry) => entry.importedAt)
      .sort()
      .at(-1);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} accounts={accounts} />
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Contas"
          action={
            addingAccount ? null : (
              <Button onClick={() => setAddingAccount(true)}>
                <Plus aria-hidden="true" />
                Adicionar conta
              </Button>
            )
          }
        />
        {addingAccount ? (
          <AddAccountForm
            people={people}
            onCancel={() => setAddingAccount(false)}
            onCreated={() => setAddingAccount(false)}
          />
        ) : null}
        {importsError}
        <DataList label="Contas" columns={ACCOUNT_COLUMNS} grid={ACCOUNT_GRID}>
          {accounts.map((account) => {
            const owner = people.find((person) => person.id === account.personId);
            const last = lastImport(account.id);
            return <AccountRow key={account.id} account={account} owner={owner} lastImportAt={last} />;
          })}
        </DataList>
        <p className="text-xs text-muted-foreground">Só dá para adicionar contas dos bancos que o Trocado sabe ler: Nubank, Itaú e Swile.</p>
      </section>
    </>
  );
}

function AccountRow({ account, owner, lastImportAt }: { account: Account; owner?: Person; lastImportAt?: string }) {
  const [renaming, setRenaming] = useState(false);
  const rename = useChange((label: string) => renameAccount(account.id, label), {
    toastErrors: false,
    onSuccess: () => toast.success('Nome salvo.'),
  });
  return (
    <li className={cn('relative grid gap-x-4 gap-y-1 px-4 py-3 pr-12 text-sm lg:items-center lg:gap-3 lg:pr-4', ACCOUNT_GRID)}>
      <DataCell label="Conta" className="min-w-0 break-words font-medium">
        {account.label}
      </DataCell>
      <DataCell label="Banco">{BANK_LABEL[account.bank]}</DataCell>
      <DataCell label="Tipo" className="text-muted-foreground">
        {ACCOUNT_TYPE_LABEL[account.type]}
      </DataCell>
      <span className="flex items-center gap-2">
        <span className="sr-only">Dono: </span>
        {owner ? <PersonDisc name={owner.name} color={personColor(owner)} size="sm" /> : null}
        <span>{owner?.name ?? '—'}</span>
      </span>
      <DataCell label="Formato do arquivo" className="text-muted-foreground">
        {accountFileLabel(account)}
      </DataCell>
      <span className="text-muted-foreground">
        {lastImportAt ? `última importação em ${formatTimestamp(lastImportAt)}` : 'nenhuma ainda'}
      </span>
      <span className="absolute right-2 top-2 lg:static lg:justify-self-end">
        {renaming ? (
          <span className="block size-8" aria-hidden="true" />
        ) : (
          <RenameButton name={account.label} onClick={() => { rename.reset(); setRenaming(true); }} />
        )}
      </span>
      {renaming ? (
        <div className="col-span-full pt-2">
          <RenameForm
            value={account.label}
            maxLength={NAME_MAX_LENGTH}
            pending={rename.isPending}
            error={rename.error?.message ?? null}
            onSave={(label) => rename.mutateAsync(label).then(() => { setRenaming(false); return true; }, () => false)}
            onCancel={() => { rename.reset(); setRenaming(false); }}
          />
        </div>
      ) : null}
    </li>
  );
}
