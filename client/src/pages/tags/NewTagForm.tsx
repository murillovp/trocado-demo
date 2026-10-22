import { useState } from 'react';
import { toast } from 'sonner';
import { createTag } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TAG_NAME_MAX_LENGTH } from '../../../../shared/limits';

/**
 * The name field that "Nova tag" opens. A name the household already uses (ignoring case and accents)
 * shows the server's message under the field and keeps the form open.
 */
export function NewTagForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const create = useChange((tagName: string) => createTag(tagName), {
    toastErrors: false,
    onSuccess: (_result, tagName) => {
      toast.success(`Tag "${tagName}" adicionada.`);
      onDone();
    },
  });
  const trimmed = name.trim();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed === '') return;
        create.mutate(trimmed);
      }}
    >
      <div className="w-full sm:w-72">
        <Field label="Nome da nova tag" error={create.error?.message ?? null}>
          <Input
            autoFocus
            maxLength={TAG_NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => {
              create.reset();
              setName(event.target.value);
            }}
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" loading={create.isPending} disabled={trimmed === ''}>
          Criar tag
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
