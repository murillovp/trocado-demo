import { useState } from 'react';
import { toast } from 'sonner';
import { updateHousehold } from '@/api/endpoints';
import { useBucketLabels, useChange } from '@/api/queries';
import type { BucketLabels, CategoryBucket } from '@/api/types';
import { Field } from '@/components/Field';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GROUP_NAME_MAX_LENGTH } from '../../../../shared/limits';

const BUCKETS: CategoryBucket[] = ['needs', 'wants', 'savings'];

/**
 * The form that renames the three 50/30/20 groups for the whole household (spec 3).
 * The page decides when it is open; `onClose` runs after a save and on Cancelar.
 */
export function BucketNamesForm({ onClose }: { onClose: () => void }) {
  const labels = useBucketLabels();
  const [draft, setDraft] = useState<BucketLabels>(labels);
  const save = useChange(
    (patch: Partial<BucketLabels>) => updateHousehold({ bucketLabels: patch }),
    {
      toastErrors: false,
      onSuccess: () => {
        toast.success('Nomes dos grupos salvos.');
        onClose();
      },
    },
  );

  const patch: Partial<BucketLabels> = {};
  for (const bucket of BUCKETS) {
    const trimmed = draft[bucket].trim();
    if (trimmed !== labels[bucket]) patch[bucket] = trimmed;
  }
  const empty = BUCKETS.some((bucket) => draft[bucket].trim() === '');

  return (
    <SectionCard>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!empty && Object.keys(patch).length > 0) save.mutate(patch);
        }}
      >
        <SectionHeader title="Nomes dos grupos" description="Os nomes valem para a casa toda." />
        <div className="grid gap-3 md:grid-cols-3">
          {BUCKETS.map((bucket) => (
            <Field key={bucket} label={`Nome do grupo ${labels[bucket]}`}>
              <Input maxLength={GROUP_NAME_MAX_LENGTH} value={draft[bucket]} onChange={(event) => setDraft({ ...draft, [bucket]: event.target.value })} />
            </Field>
          ))}
        </div>
        {save.error ? <p role="alert" className="text-sm text-destructive">{save.error.message}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending} disabled={empty || Object.keys(patch).length === 0}>
            Salvar nomes
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
