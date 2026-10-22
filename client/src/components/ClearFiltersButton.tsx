import { FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** "Limpar filtros": the link-style button that drops every filter of a screen. `count` names how many are on. */
export function ClearFiltersButton({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <Button
      variant="link"
      size="sm"
      className="ml-auto text-muted-foreground underline hover:text-foreground"
      aria-label={count === 1 ? 'Limpar 1 filtro' : `Limpar ${count} filtros`}
      onClick={onClear}
    >
      <FilterX aria-hidden="true" />
      Limpar filtros
    </Button>
  );
}
