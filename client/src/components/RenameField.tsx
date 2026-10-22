import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** The pencil icon that opens a rename form. Same look as the one on Categorias. */
export function RenameButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <IconButton label={`Renomear ${name}`} onClick={onClick}>
      <Pencil aria-hidden="true" />
    </IconButton>
  );
}

type FormProps = {
  /** The current name. The field reads "Novo nome de <value>". */
  value: string;
  maxLength: number;
  hint?: string;
  pending: boolean;
  /** The server's message after a failed save, shown under the field. */
  error?: string | null;
  /** Called with the trimmed new name. Return true once saved; the parent then closes the form. */
  onSave: (name: string) => Promise<boolean>;
  onCancel: () => void;
};

/** The rename field with Salvar and Cancelar. The parent decides when it is shown. */
export function RenameForm({ value, maxLength, hint, pending, error, onSave, onCancel }: FormProps) {
  const [draft, setDraft] = useState(value);
  const trimmed = draft.trim();
  const unchanged = trimmed === '' || trimmed === value;

  return (
    <form
      className="flex min-w-0 flex-col gap-1.5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (unchanged) return;
        await onSave(trimmed);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label={`Novo nome de ${value}`} value={draft} maxLength={maxLength} autoFocus onChange={(event) => setDraft(event.target.value)} className="min-w-40 max-w-sm flex-1" />
        <Button type="submit" size="sm" loading={pending} disabled={unchanged}>
          Salvar nome
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </form>
  );
}
