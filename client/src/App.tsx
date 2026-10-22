import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { createQueryClient } from '@/api/queryClient';
import { Layout } from '@/app/Layout';
import { ViewProvider } from '@/app/view';
import { Toaster } from '@/components/ui/sonner';
import { AnalisePage } from '@/pages/AnalisePage';
import { CategoriasPage } from '@/pages/CategoriasPage';
import { FornecedoresPage } from '@/pages/FornecedoresPage';
import { GeralPage } from '@/pages/GeralPage';
import { IaPage } from '@/pages/IaPage';
import { ImportarPage } from '@/pages/ImportarPage';
import { ImportReviewPage } from '@/pages/ImportReviewPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrcamentoPage } from '@/pages/OrcamentoPage';
import { ParcelasPage } from '@/pages/ParcelasPage';
import { PessoasPage } from '@/pages/PessoasPage';
import { TagsPage } from '@/pages/TagsPage';
import { TransacoesPage } from '@/pages/TransacoesPage';
import { VisaoPage } from '@/pages/VisaoPage';

/** Where the Tags page lived before it moved under Configurações (plan 20). Old links and bookmarks still land on it. */
function OldTagsAddress() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/configuracoes/tags', search }} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<VisaoPage />} />
        <Route path="transacoes" element={<TransacoesPage />} />
        <Route path="transacoes/importar" element={<ImportarPage />} />
        <Route path="transacoes/importar/:id" element={<ImportReviewPage />} />
        <Route path="transacoes/parcelas" element={<ParcelasPage />} />
        <Route path="orcamento" element={<OrcamentoPage />} />
        <Route path="analise" element={<AnalisePage />} />
        <Route path="analise/tags" element={<OldTagsAddress />} />
        <Route path="configuracoes" element={<GeralPage />} />
        <Route path="configuracoes/categorias" element={<CategoriasPage />} />
        <Route path="configuracoes/fornecedores" element={<FornecedoresPage />} />
        <Route path="configuracoes/tags" element={<TagsPage />} />
        <Route path="configuracoes/pessoas" element={<PessoasPage />} />
        <Route path="configuracoes/ia" element={<IaPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ViewProvider>
          <AppRoutes />
        </ViewProvider>
      </HashRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
