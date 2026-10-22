import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCategories, useImports, useIntegrity, usePeople, useVendors } from '@/api/queries';
import { CardLink } from '@/components/CardLink';
import { Notice } from '@/components/Notice';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/States';
import { plural } from '@/lib/format';
import { integritySentence } from '@/lib/integrity';

const PAGES = [
  { to: '/configuracoes/categorias', title: 'Categorias', text: 'Cada categoria dentro de um grupo do 50/30/20.' },
  { to: '/configuracoes/fornecedores', title: 'Fornecedores', text: 'Os apelidos guardados e as regras que os reconhecem.' },
  { to: '/configuracoes/pessoas', title: 'Pessoas e contas', text: 'Metas e renda de referência de cada um, e as contas.' },
];

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

/**
 * A count read from a query. A query that failed never sits forever looking
 * like it is still loading: it shows the server's message with a retry.
 */
function count(query: UseQueryResult<unknown[], Error>, describe: (total: number) => string): ReactNode {
  if (query.isError) return <ErrorState inline error={query.error} onRetry={() => void query.refetch()} />;
  return query.data ? describe(query.data.length) : '…';
}

/**
 * Names each rule the stored data breaks, with its count. Shows nothing while
 * all is well. A check that could not be read says so, with a retry.
 */
function IntegrityNotice() {
  const integrity = useIntegrity();
  if (integrity.isError) return <ErrorState inline error={integrity.error} onRetry={() => void integrity.refetch()} />;
  if (!integrity.data || integrity.data.length === 0) return null;
  return (
    <Notice tone="error">
      <SectionHeader title="Algo nos dados não bate" />
      <ul className="flex flex-col gap-1 text-sm">
        {integrity.data.map((problem) => (
          <li key={problem.check}>{integritySentence(problem.check, problem.count)}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">Abra Transações e corrija esses lançamentos, ou peça ajuda.</p>
    </Notice>
  );
}

/** What belongs to the whole household. No person selector here (ADR-0004). */
export function GeralPage() {
  const people = usePeople();
  const categories = useCategories();
  const vendors = useVendors();
  const imports = useImports();

  return (
    <>
      <PageHeader eyebrow="Configurações" title="Geral" intro="O que vale para a casa inteira. As outras páginas cuidam de categorias, fornecedores, pessoas e da inteligência artificial." />
      <IntegrityNotice />
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard>
          <SectionHeader title="A casa" />
          <dl className="flex flex-wrap gap-6">
            <Fact label="Idioma" value="Português do Brasil" />
            <Fact label="Moeda" value="Real (R$)" />
            <Fact label="Pessoas" value={count(people, (total) => String(total))} />
          </dl>
          <p className="text-xs text-muted-foreground">Idioma e moeda são fixos nesta versão.</p>
        </SectionCard>
        <SectionCard>
          <SectionHeader title="O que o Trocado guardou" />
          <ul className="flex flex-col gap-1 text-sm">
            <li>{count(categories, (total) => plural(total, 'categoria', 'categorias'))}</li>
            <li>{count(vendors, (total) => plural(total, 'fornecedor', 'fornecedores'))}</li>
            <li>{count(imports, (total) => plural(total, 'importação', 'importações'))}</li>
          </ul>
          <p className="text-xs text-muted-foreground">Tudo fica num arquivo só, neste computador.</p>
        </SectionCard>
      </div>
      <nav aria-label="Páginas de configuração" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PAGES.map((page) => (
          <CardLink key={page.to} to={page.to} className="flex flex-col gap-1.5 p-4">
            <span className="text-sm font-semibold">{page.title}</span>
            <span className="text-xs text-muted-foreground">{page.text}</span>
          </CardLink>
        ))}
      </nav>
    </>
  );
}
