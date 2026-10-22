import { useState } from 'react';
import { useCategories, useVendors } from '@/api/queries';
import type { Category, VendorSummary } from '@/api/types';
import { DataList } from '@/components/DataList';
import { Field } from '@/components/Field';
import { NativeSelect } from '@/components/NativeSelect';
import { PageHeader } from '@/components/PageHeader';
import { QueryView } from '@/components/QueryView';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOpenRow } from '@/lib/useOpenRow';
import { matchesVendor, VENDOR_FILTERS, type VendorFilter } from '@/lib/vendors';
import { VendorRow, VENDOR_COLUMNS, VENDOR_GRID } from './fornecedores/VendorRow';

const PAGE_SIZE = 50;

export function FornecedoresPage() {
  const vendors = useVendors();
  const categoriesQuery = useCategories();

  const header = (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Fornecedores"
        intro="A memória do Trocado. Cada linha é um apelido com a regra que o reconhece. Fornecedor conhecido nunca mais passa pela IA."
      />
      {categoriesQuery.isError ? (
        <ErrorState inline error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} />
      ) : null}
    </>
  );

  return (
    <QueryView query={vendors} header={header} loading={<ListSkeleton />} className="contents">
      {(all) => <VendorBrowser vendors={all} categories={categoriesQuery.data ?? []} />}
    </QueryView>
  );
}

function VendorBrowser({ vendors: all, categories }: { vendors: VendorSummary[]; categories: Category[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VendorFilter>('all');
  const { openId, toggle, close, guard } = useOpenRow();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = all.filter((vendor) => matchesVendor(vendor, search, filter));
  const rest = shown.length - visible;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <Field label="Buscar">
            <Input type="search" placeholder="Apelido ou nome no extrato" value={search} onChange={(event) => setSearch(event.target.value)} />
          </Field>
        </div>
        <div className="w-full sm:w-60">
          <Field label="Mostrar">
            <NativeSelect value={filter} onChange={(event) => setFilter(event.target.value as VendorFilter)}>
              {VENDOR_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {all.filter((vendor) => matchesVendor(vendor, '', option.value)).length}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState>Nenhum fornecedor com esses filtros.</EmptyState>
      ) : (
        <DataList label="Fornecedores" columns={VENDOR_COLUMNS} grid={VENDOR_GRID}>
          {shown.slice(0, visible).map((vendor) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              categories={categories}
              open={openId === vendor.id}
              onToggle={() => toggle(vendor.id)}
              onClose={() => close(vendor.id)}
              guard={guard}
            />
          ))}
        </DataList>
      )}
      {rest > 0 ? (
        <Button variant="outline" className="self-center" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
          Mostrar mais {Math.min(rest, PAGE_SIZE)}
        </Button>
      ) : null}
    </>
  );
}
