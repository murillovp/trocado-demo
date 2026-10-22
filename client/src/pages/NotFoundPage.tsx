import { TextLink } from '@/components/TextLink';

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">Página não encontrada</h1>
      <TextLink to="/" className="text-sm">
        Voltar para a Visão do mês
      </TextLink>
    </div>
  );
}
