import { toast } from 'sonner';
import { reclassifyImports } from '@/api/endpoints';
import { useChange } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { aiFailureText } from '@/lib/aiErrors';
import { plural } from '@/lib/format';

/** Asks the AI again about every line still missing a category (spec section 3, step 6). */
export function ReclassifyButton() {
  const run = useChange(() => reclassifyImports(), {
    onSuccess: (result) => {
      if (result.aiFailed) {
        if (result.aiFailure) {
          const { problem, next } = aiFailureText(result.aiFailure);
          toast.error('A IA não respondeu. Nada mudou.', { description: `${problem} ${next}` });
        } else {
          toast.error('A IA não respondeu. Nada mudou.');
        }
      } else if (result.askedCount === 0) toast('Nenhum lançamento sem categoria.');
      else toast.success(`${plural(result.categorizedCount, 'lançamento ganhou', 'lançamentos ganharam')} categoria.`);
    },
  });
  return (
    <Button variant="outline" disabled={run.isPending} onClick={() => run.mutate(undefined)}>
      {run.isPending ? 'Perguntando à IA…' : 'Pedir de novo à IA'}
    </Button>
  );
}
