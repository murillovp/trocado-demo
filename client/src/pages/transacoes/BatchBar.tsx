import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { acceptVendors, batchChangeTransactions, tagTransactions } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import type { Category, LedgerLine, Tag, TransactionKind } from '@/api/types';
import { CategoryPicker } from '@/components/CategoryPicker';
import { SelectionBar } from '@/components/SelectionBar';
import { TagMenu } from '@/components/TagMenu';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  BATCH_KINDS,
  categoriesInCommon,
  categoryChangedMessage,
  kindChangedMessage,
  suggestedVendorIds,
  vendorsConfirmedMessage,
} from '@/lib/batch';
import { kindLabel } from '@/lib/labels';
import { bulkTagMessage, distinctTags, type TagAction } from '@/lib/tags';

/** Why "Categoria" is off when the selected lines share no category. */
const NO_COMMON_CATEGORY =
  'Os lançamentos escolhidos não têm uma categoria em comum. Mude o tipo ou escolha lançamentos do mesmo tipo.';

type Props = {
  lines: LedgerLine[];
  /** The household's categories, as the line editor offers them. */
  categories: Category[];
  /** Unselects every line. The bar calls it after a change that went through. */
  onClear: () => void;
};

/**
 * The selection bar of Transações, wired to the server. Each action sends one request for all the
 * selected lines and is all or nothing: a success toasts how many changed and clears the selection; a refusal
 * (money that left cannot become Entrada, for one) shows the server's message and keeps the selection.
 * "Categoria" offers the categories every selected line can take. "Tipo" offers all four types and lets the
 * server refuse what a line cannot be. "Tag" adds or removes a tag. "Confirmar IA" shows only while a selected
 * line's seller still carries the "IA" mark, and confirms each such seller once. No action teaches a seller rule,
 * and none moves a total except a category or type change, which moves it as editing each line would.
 */
export function BatchBar({ lines, categories, onClear }: Props) {
  const transactionIds = lines.map((line) => line.id);
  const vendorIds = suggestedVendorIds(lines);
  const fitting = categoriesInCommon(categories, lines);

  const changeCategory = useChange((categoryId: string) => batchChangeTransactions({ transactionIds, change: { categoryId } }), {
    onSuccess: ({ changed }) => {
      toast.success(categoryChangedMessage(changed));
      onClear();
    },
  });
  const changeKind = useChange((kind: TransactionKind) => batchChangeTransactions({ transactionIds, change: { kind } }), {
    onSuccess: ({ changed }) => {
      toast.success(kindChangedMessage(changed));
      onClear();
    },
  });
  const changeTags = useChange(
    ({ tag, action }: { tag: Tag; action: TagAction }) => tagTransactions({ transactionIds, tagId: tag.id, action }),
    {
      onSuccess: ({ changed }, { tag, action }) => {
        toast.success(bulkTagMessage(action, tag.name, changed));
        onClear();
      },
    },
  );
  const confirmAi = useChange(() => acceptVendors({ vendorIds }), {
    onSuccess: ({ accepted }) => {
      toast.success(vendorsConfirmedMessage(accepted));
      onClear();
    },
  });
  const busy = changeCategory.isPending || changeKind.isPending || changeTags.isPending || confirmAi.isPending;

  return (
    <SelectionBar count={lines.length} onClear={onClear}>
      {/* A disabled button shows no tooltip in some browsers, so the title sits on the wrapper. */}
      <span title={fitting.length === 0 ? NO_COMMON_CATEGORY : undefined} className="flex">
        <CategoryPicker
          label="Categoria"
          triggerText="Categoria"
          className="w-auto font-medium hover:bg-hover"
          value=""
          options={fitting.map((category) => ({ id: category.id, name: category.name }))}
          disabled={busy || fitting.length === 0}
          onChange={(categoryId) => changeCategory.mutate(categoryId)}
        />
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" disabled={busy}>
            Tipo
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {BATCH_KINDS.map((kind) => (
            <DropdownMenuItem key={kind} onSelect={() => changeKind.mutate(kind)}>
              {kindLabel(kind)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <TagMenu
        removeOptions={distinctTags(lines.map((line) => line.tags ?? []))}
        busy={busy}
        onAdd={(picked) => changeTags.mutate({ tag: picked, action: 'add' })}
        onRemove={(picked) => changeTags.mutate({ tag: picked, action: 'remove' })}
      />
      {vendorIds.length > 0 ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => confirmAi.mutate(undefined)}>
          Confirmar IA
        </Button>
      ) : null}
    </SelectionBar>
  );
}
