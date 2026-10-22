import { useEffect } from 'react';
import { useImports } from '@/api/queries';
import { PageHeader } from '@/components/PageHeader';
import { PendingImportNotice } from '@/components/PendingImportNotice';
import { ReclassifyButton } from '@/components/ReclassifyButton';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { TextLink } from '@/components/TextLink';
import { ImportHistory } from './importar/ImportHistory';
import { clearSavedDraftsExcept } from './importar/savedDrafts';
import { UploadCard } from './importar/UploadCard';

/** A file belongs to one account, so this screen has no person selector (ADR-0004). */
export function ImportarPage() {
  // Once the list is fresh, a review copy kept for an import that is no longer waiting is deleted:
  // the import was confirmed or discarded in another tab or on another device.
  const imports = useImports();
  useEffect(() => {
    if (!imports.isSuccess || imports.isFetching) return;
    clearSavedDraftsExcept(new Set(imports.data.filter((entry) => entry.status === 'pending').map((entry) => entry.id)));
  }, [imports.isSuccess, imports.isFetching, imports.data]);

  return (
    <>
      <PageHeader
        eyebrow="Transações"
        title="Importar"
        intro="Envie o extrato ou a fatura. O Trocado lê cada linha, pula o que já foi importado e mostra tudo para você revisar antes de entrar nos totais."
      />
      <PendingImportNotice />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <UploadCard />
        <SectionCard>
          <SectionHeader title="Lançamentos sem categoria" />
          <p className="text-sm text-muted-foreground">
            Quando a IA não responde, os lançamentos entram sem categoria. Peça de novo aqui. Sem chave em{' '}
            <TextLink to="/configuracoes/ia">Inteligência artificial</TextLink>, a IA não é chamada.
          </p>
          <ReclassifyButton />
        </SectionCard>
      </div>
      <ImportHistory />
    </>
  );
}
