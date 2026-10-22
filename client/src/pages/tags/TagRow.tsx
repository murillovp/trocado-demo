import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTag, renameTag } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import type { TagTotals } from '@/api/types';
import { IconButton } from '@/components/IconButton';
import { Money } from '@/components/Money';
import { RenameButton, RenameForm } from '@/components/RenameField';
import { RowLink } from '@/components/RowLink';
import { Button } from '@/components/ui/button';
import { formatDate, plural } from '@/lib/format';
import { TAG_NAME_MAX_LENGTH } from '../../../../shared/limits';

type Props = {
  tag: TagTotals;
  selected: boolean;
  onSelect: () => void;
  /** Called after the tag is deleted, so the page can close its detail. */
  onDeleted: () => void;
  /**
   * How many lines carry the tag in the whole household. The delete question says it, because deleting
   * takes the tag off every line, whoever's they are. The row's own `lineCount` follows the subject.
   */
  householdLineCount: number;
};

/** "03/09/2026 a 18/10/2026", one date when both ends fall on the same day, or "Sem lançamentos". */
function datesText(tag: TagTotals): string {
  if (tag.firstDate === null || tag.lastDate === null) return 'Sem lançamentos';
  const first = formatDate(tag.firstDate);
  const last = formatDate(tag.lastDate);
  return `${plural(tag.lineCount, 'lançamento', 'lançamentos')} · ${first === last ? first : `${first} a ${last}`}`;
}

/** The sentence that asks before a tag is deleted. The lines stay; only the tag goes. */
export function deleteQuestion(name: string, lineCount: number): string {
  if (lineCount === 0) return `Apagar a tag "${name}"? Nenhum lançamento a usa.`;
  return `Apagar a tag "${name}"? Ela sai de ${plural(lineCount, 'lançamento', 'lançamentos')}. ${lineCount === 1 ? 'O lançamento continua.' : 'Os lançamentos continuam.'}`;
}

/**
 * One tag in the Tags list: its name, spending, line count and dates. Selecting the row opens its detail.
 * The pencil (rename in place, on its own line under the row) and the trash (an inline question)
 * sit at the right edge as muted icon buttons, as on Categorias.
 */
export function TagRow({ tag, selected, onSelect, onDeleted, householdLineCount }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const rename = useChange((name: string) => renameTag(tag.tagId, name), {
    toastErrors: false,
    onSuccess: () => {
      toast.success('Tag renomeada.');
      setRenaming(false);
    },
  });
  const remove = useChange(() => deleteTag(tag.tagId), {
    onSuccess: (result) => {
      toast.success(
        result.linesUntagged === 0
          ? `Tag "${tag.name}" apagada.`
          : `Tag "${tag.name}" apagada. Ela saiu de ${plural(result.linesUntagged, 'lançamento', 'lançamentos')}.`,
      );
      onDeleted();
    },
  });

  return (
    <li className="flex flex-wrap items-center gap-x-1 gap-y-2">
      <RowLink
        selected={selected}
        onClick={onSelect}
        title="Ver o detalhe desta tag"
        className="m-0 flex min-w-0 flex-1 flex-col gap-0.5 py-1.5"
      >
        <span className="flex items-start gap-2">
          <span title={tag.name} className="min-w-0 flex-1 line-clamp-2 break-words">{tag.name}</span>
          <Money cents={tag.spendingCents} kind="expense" />
        </span>
        <span className="text-xs text-muted-foreground">{datesText(tag)}</span>
      </RowLink>
      {renaming ? null : <RenameButton name={tag.name} onClick={() => { rename.reset(); setRenaming(true); }} />}
      {confirmingDelete ? null : (
        <IconButton
          label={`Apagar ${tag.name}`}
          className="hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 aria-hidden="true" />
        </IconButton>
      )}
      {confirmingDelete ? (
        <div className="flex basis-full flex-wrap items-center gap-2 text-sm">
          <span>{deleteQuestion(tag.name, householdLineCount)}</span>
          <Button size="sm" variant="destructive" loading={remove.isPending} onClick={() => remove.mutate(undefined)}>
            Sim, apagar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
            Não
          </Button>
        </div>
      ) : null}
      {renaming ? (
        <div className="basis-full">
          <RenameForm
            value={tag.name}
            maxLength={TAG_NAME_MAX_LENGTH}
            pending={rename.isPending}
            error={rename.error?.message ?? null}
            onSave={(name) => rename.mutateAsync(name).then(() => true, () => false)}
            onCancel={() => {
              rename.reset();
              setRenaming(false);
            }}
          />
        </div>
      ) : null}
    </li>
  );
}
