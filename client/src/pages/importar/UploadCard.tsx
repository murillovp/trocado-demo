import { Loader2 } from 'lucide-react';
import { useAccounts, usePeople } from '@/api/queries';
import { Notice } from '@/components/Notice';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { ErrorState } from '@/components/States';
import { Button } from '@/components/ui/button';
import { DetectedFile } from './DetectedFile';
import { DropZone } from './DropZone';
import { ImportProgress } from './ImportProgress';
import { UploadError } from './UploadError';
import { useUploadFlow } from './useUploadFlow';

const ACCEPTED_FILES = 'Aceita CSV do Nubank (conta e cartão), PDF do Itaú e capturas do Swile (PNG ou JPEG).';

/**
 * Choosing a file asks the server what it is and which accounts fit. The
 * first fitting account is proposed; the user can pick another before
 * anything is read (plan decision 13). Several files are accepted only when
 * every one of them is an image: they are Swile screenshots of the same
 * period, read together as one import (plan 6, decision 4).
 */
export function UploadCard() {
  const peopleQuery = usePeople();
  const accountsQuery = useAccounts();
  const loadError = peopleQuery.isError ? peopleQuery : accountsQuery.isError ? accountsQuery : null;
  const flow = useUploadFlow();

  return (
    <SectionCard>
      <SectionHeader title="Enviar um arquivo" />
      {loadError ? <ErrorState inline error={loadError.error} onRetry={() => void loadError.refetch()} /> : null}
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          flow.submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <DropZone picked={flow.picked} locked={flow.locked} onChoose={(files) => void flow.choose(files)} />
          <p className="text-sm text-muted-foreground">{ACCEPTED_FILES}</p>
        </div>

        {flow.detecting ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Reconhecendo o arquivo…
          </p>
        ) : null}

        {flow.detection ? (
          <DetectedFile
            detection={flow.detection}
            picked={flow.picked}
            people={peopleQuery.data ?? []}
            accounts={accountsQuery.data ?? []}
            accountId={flow.accountId}
            onAccountChange={flow.setAccountId}
            accountsFailed={Boolean(loadError)}
          />
        ) : null}

        {flow.importing ? <ImportProgress step={flow.step} isSwile={flow.isSwile} /> : null}
        {flow.notice ? <Notice role="status">{flow.notice}</Notice> : null}

        <UploadError pickError={flow.pickError} error={flow.error} />

        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1"
            disabled={!flow.picked.length || !flow.detection || !flow.accountId || flow.importing || Boolean(loadError)}
          >
            {flow.importing ? (flow.isSwile ? 'Lendo as capturas…' : 'Lendo o arquivo…') : flow.isSwile ? 'Ler capturas' : 'Ler arquivo'}
          </Button>
          {flow.importing ? (
            <Button type="button" variant="outline" onClick={flow.cancel}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
    </SectionCard>
  );
}
