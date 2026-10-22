import { useState, type ReactElement } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { TAG_POPOVER_CLASS, TagList } from '@/components/TagList';
import type { Tag } from '@/api/types';

type Props = {
  /** The button that opens the list. One element that takes a ref and the usual button props. */
  trigger: ReactElement;
  /** The tags the list offers. Left out, it offers every tag of the household. */
  options?: Tag[];
  /** Called with the tag the user picked, or with the one he just created. */
  onPick: (tag: Tag) => void;
  /** Offers "Criar "…"" when the typed name matches no tag. Off for a list that only removes. */
  allowCreate?: boolean;
  /** Every tag that exists, so a typed name that an unlisted tag already has is not offered as new. Defaults to the household's tags. */
  known?: Tag[];
  /** What the search box is called, for assistive technology. */
  searchLabel?: string;
  /** Shown when the list has nothing to offer. */
  emptyText?: string;
};

/**
 * A searchable list of tags that opens from `trigger`. The list is `TagList`: it filters as you
 * type, ignoring accents and case, and with `allowCreate` it saves a typed name as a new tag and
 * picks it. A name the server refuses shows as the usual error toast and the list stays open.
 */
export function TagCombobox({ trigger, onPick, ...list }: Props): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <PopoverPrimitive.Root modal open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className={TAG_POPOVER_CLASS}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <TagList
            {...list}
            onPick={(tag) => {
              onPick(tag);
              setOpen(false);
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
