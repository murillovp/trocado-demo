import { Archive, ArrowDown, ArrowUp, Ellipsis, Pencil } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { archiveCategory, updateCategory } from '@/api/endpoints';
import { useBucketLabels, useChange } from '@/api/queries';
import type { Category, CategoryBucket } from '@/api/types';
import { IconButton } from '@/components/IconButton';
import { NativeSelect } from '@/components/NativeSelect';
import { RenameButton, RenameForm } from '@/components/RenameField';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NAME_MAX_LENGTH } from '../../../../shared/limits';

type Props = {
  category: Category;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Some move is running. Every row locks its arrows, because a second move would start from the old list. */
  moving: boolean;
  onMove: (direction: -1 | 1) => void;
};

/** The menu has no empty value, so "Sem grupo" gets a word of its own. */
const NO_BUCKET = 'none';

/**
 * One category in the Categorias list. From `xl` (1280 px) up the controls sit inline in the row.
 * Below `xl` they collapse into one "Ações" menu that runs the same changes under the same lock.
 */
export function CategoryRow({ category, canMoveUp, canMoveDown, moving, onMove }: Props) {
  const labels = useBucketLabels();
  const [renaming, setRenaming] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  // Set when "Renomear" is chosen. The menu holds the focus while it closes, so the field gets it afterwards.
  const focusRenameField = useRef(false);

  const update = useChange((patch: { bucket: CategoryBucket | null }) => updateCategory(category.id, patch), {
    onSuccess: (result, patch) => {
      const group = patch.bucket === null ? 'sem grupo' : `em ${labels[patch.bucket]}`;
      toast.success(`${category.name} agora está ${group}.`);
      if (result.linesChanged > 0) {
        const kind = patch.bucket === 'savings' ? 'Poupança' : 'Gasto';
        const lines = result.linesChanged === 1 ? '1 lançamento passou' : `${result.linesChanged} lançamentos passaram`;
        toast.success(`${lines} para ${kind}.`);
      }
    },
  });
  const rename = useChange((name: string) => updateCategory(category.id, { name }), {
    toastErrors: false,
    onSuccess: () => {
      toast.success('Categoria renomeada.');
      setRenaming(false);
    },
  });
  // The arrows and the bucket select share one lock, so no change starts from a list about to be replaced.
  const locked = moving || update.isPending;
  const archive = useChange(() => archiveCategory(category.id), {
    onSuccess: () => toast.success('Categoria arquivada. Os lançamentos antigos continuam com ela.'),
  });
  const changeBucket = (bucket: CategoryBucket | null) => update.mutate({ bucket });
  // Until the save and the refetch finish, the controls show the group just chosen. If the save fails they go back.
  const shownBucket = update.isPending ? update.variables.bucket : category.bucket;
  const startRenaming = () => {
    rename.reset();
    focusRenameField.current = true;
    setRenaming(true);
  };

  return (
    <li ref={row} className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover">
      <span className="min-w-0 flex-1 text-sm">{category.name}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={`Ações de ${category.name}`} className="xl:hidden">
            <Ellipsis aria-hidden="true" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(event) => {
          if (!focusRenameField.current) return;
          focusRenameField.current = false;
          event.preventDefault();
          row.current?.querySelector('input')?.focus();
        }}>
          <DropdownMenuItem disabled={!canMoveUp || locked} onSelect={() => onMove(-1)}>
            <ArrowUp aria-hidden="true" />
            Subir
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canMoveDown || locked} onSelect={() => onMove(1)}>
            <ArrowDown aria-hidden="true" />
            Descer
          </DropdownMenuItem>
          <DropdownMenuItem disabled={renaming} onSelect={startRenaming}>
            <Pencil aria-hidden="true" />
            Renomear
          </DropdownMenuItem>
          {category.appliesTo === 'expense' ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Grupo</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                aria-label="Grupo"
                value={shownBucket ?? NO_BUCKET}
                onValueChange={(value) => {
                  const bucket = value === NO_BUCKET ? null : (value as CategoryBucket);
                  if (bucket !== category.bucket) changeBucket(bucket);
                }}
              >
                <DropdownMenuRadioItem value="needs" disabled={locked}>{labels.needs}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="wants" disabled={locked}>{labels.wants}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="savings" disabled={locked}>{labels.savings}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value={NO_BUCKET} disabled={locked}>Sem grupo</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={confirmingArchive} onSelect={() => setConfirmingArchive(true)}>
            <Archive aria-hidden="true" />
            Arquivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* From lg up these sit straight in the row (`contents`), as they always did. */}
      <div className="hidden xl:contents">
        {category.appliesTo === 'expense' ? (
          <NativeSelect
            aria-label={`Grupo de ${category.name}`}
            className="h-8 w-40"
            value={shownBucket ?? ''}
            disabled={locked}
            onChange={(event) => changeBucket((event.target.value || null) as CategoryBucket | null)}
          >
            <option value="needs">{labels.needs}</option>
            <option value="wants">{labels.wants}</option>
            <option value="savings">{labels.savings}</option>
            <option value="">Sem grupo</option>
          </NativeSelect>
        ) : null}

        <IconButton label={`Subir ${category.name}`} disabled={!canMoveUp || locked} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden="true" />
        </IconButton>
        <IconButton label={`Descer ${category.name}`} disabled={!canMoveDown || locked} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden="true" />
        </IconButton>
        {renaming ? null : <RenameButton name={category.name} onClick={startRenaming} />}
        {confirmingArchive ? null : (
          <IconButton
            label={`Arquivar ${category.name}`}
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmingArchive(true)}
          >
            <Archive aria-hidden="true" />
          </IconButton>
        )}
      </div>
      {confirmingArchive ? (
        <span className="flex basis-full flex-wrap items-center gap-1 text-sm xl:basis-auto">
          Arquivar {category.name}? Os lançamentos antigos continuam com ela, e ela sai das listas.
          <Button size="sm" variant="destructive" loading={archive.isPending} onClick={() => archive.mutate(undefined)}>
            Sim, arquivar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmingArchive(false)}>
            Não
          </Button>
        </span>
      ) : null}
      {renaming ? (
        <div className="basis-full">
          <RenameForm
            value={category.name}
            maxLength={NAME_MAX_LENGTH}
            pending={rename.isPending}
            error={rename.error?.message ?? null}
            onSave={(name) => rename.mutateAsync(name).then(() => true, () => false)}
            onCancel={() => { rename.reset(); setRenaming(false); }}
          />
        </div>
      ) : null}
    </li>
  );
}
