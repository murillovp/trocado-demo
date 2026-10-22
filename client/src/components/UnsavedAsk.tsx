import { Button } from '@/components/ui/button';

type Props = { onDiscard: () => void; onKeepEditing: () => void };

/**
 * The question an open editor asks before it loses unsaved changes, inline where its
 * buttons are. Focus lands on "Continuar editando", the answer that loses nothing.
 */
export function UnsavedAsk({ onDiscard, onKeepEditing }: Props) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
      Descartar as alterações desta linha?
      <Button type="button" variant="destructive" size="sm" onClick={onDiscard}>
        Descartar
      </Button>
      <Button type="button" variant="ghost" size="sm" autoFocus onClick={onKeepEditing}>
        Continuar editando
      </Button>
    </div>
  );
}
