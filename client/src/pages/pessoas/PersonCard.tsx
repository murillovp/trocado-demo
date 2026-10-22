import { useState } from 'react';
import { toast } from 'sonner';
import { updatePerson } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import type { Account, Person } from '@/api/types';
import { PersonDisc } from '@/components/PersonDisc';
import { RenameButton, RenameForm } from '@/components/RenameField';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { personColor } from '@/lib/colors';
import { PERSON_NAME_MAX_LENGTH } from '../../../../shared/limits';
import { TargetsForm } from './TargetsForm';

/** One person on Pessoas e contas: name, colour, rename, and the targets form. */
export function PersonCard({ person, accounts }: { person: Person; accounts: Account[] }) {
  const [renaming, setRenaming] = useState(false);
  const rename = useChange((name: string) => updatePerson(person.id, { name }), {
    toastErrors: false,
    onSuccess: () => toast.success('Nome salvo.'),
  });

  return (
    <section aria-label={person.name}>
      <SectionCard>
        <SectionHeader
          leading={<PersonDisc name={person.name} color={personColor(person)} />}
          title={person.name}
          description={accounts.filter((account) => account.personId === person.id).map((account) => account.label).join(' · ')}
          action={
            renaming ? (
              <span className="block size-8" aria-hidden="true" />
            ) : (
              <RenameButton name={person.name} onClick={() => { rename.reset(); setRenaming(true); }} />
            )
          }
        />
        {renaming ? (
          <RenameForm
            value={person.name}
            maxLength={PERSON_NAME_MAX_LENGTH}
            hint="O Trocado reconhece Pix entre vocês pelo primeiro nome. Mantenha o primeiro nome como aparece no banco."
            pending={rename.isPending}
            error={rename.error?.message ?? null}
            onSave={(name) => rename.mutateAsync(name).then(() => { setRenaming(false); return true; }, () => false)}
            onCancel={() => { rename.reset(); setRenaming(false); }}
          />
        ) : null}
        <TargetsForm person={person} />
      </SectionCard>
    </section>
  );
}
