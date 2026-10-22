import { ChevronDown, Minus, Plus } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import type { Tag } from '@/api/types';
import { TAG_POPOVER_CLASS, TagList } from '@/components/TagList';
import { Button } from '@/components/ui/button';

type Props = {
  /** The tags "Remover tag" offers, usually those on the selected lines. Left out, it offers every tag. */
  removeOptions?: Tag[];
  /** True while a request is out, so a second click cannot start another. */
  busy?: boolean;
  /** Adds the tag to every selected line. The list also creates a tag from a typed name. */
  onAdd: (tag: Tag) => void;
  /** Takes the tag off every selected line. */
  onRemove: (tag: Tag) => void;
};

type Action = 'add' | 'remove';

/**
 * The "Tag" button of a selection bar. It opens a small menu with "Adicionar tag" and "Remover tag";
 * choosing one swaps the menu for the searchable tag list, and picking a tag closes it. The menu
 * starts over at the two choices each time it opens. Transações and the import review both use it.
 */
export function TagMenu({ removeOptions, busy = false, onAdd, onRemove }: Props): ReactElement {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setAction(null);
  }

  function pick(tag: Tag) {
    (action === 'add' ? onAdd : onRemove)(tag);
    handleOpenChange(false);
  }

  return (
    <PopoverPrimitive.Root modal open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <Button type="button" variant="outline" disabled={busy}>
          Tag
          <ChevronDown aria-hidden="true" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" className={TAG_POPOVER_CLASS}>
          {action === null ? (
            <div className="flex flex-col p-1">
              <Button type="button" variant="ghost" className="justify-start" onClick={() => setAction('add')}>
                <Plus aria-hidden="true" />
                Adicionar tag
              </Button>
              <Button type="button" variant="ghost" className="justify-start" onClick={() => setAction('remove')}>
                <Minus aria-hidden="true" />
                Remover tag
              </Button>
            </div>
          ) : action === 'add' ? (
            <TagList allowCreate onPick={pick} />
          ) : (
            <TagList options={removeOptions} emptyText="Nenhuma tag nos lançamentos selecionados" onPick={pick} />
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
