import { acceptVendor } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import { Button } from '@/components/ui/button';

/**
 * What an editor says about a seller rule the AI wrote, with the button that accepts it.
 * Accepting makes the rule the user's and removes the "IA" mark once every query is fetched
 * again. It sits inside the editor's form, so the button never submits it, and it changes
 * nothing of what the user has typed.
 */
export function AcceptSuggestion({ vendorId }: { vendorId: string }) {
  const accept = useChange(() => acceptVendor(vendorId));
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <p>A IA sugeriu o apelido e a categoria.</p>
      <Button type="button" variant="outline" size="sm" loading={accept.isPending} onClick={() => accept.mutate(undefined)}>
        Confirmar
      </Button>
    </div>
  );
}
