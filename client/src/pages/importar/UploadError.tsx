import type { ApiError } from '@/api/client';
import { TextLink } from '@/components/TextLink';
import { AiFailureNotice, aiFailureOf } from '@/lib/aiErrors';

/** What the alert shows for one API failure. Most codes just echo the server's PT-BR text. */
function errorContent(error: ApiError) {
  if (error.code === 'ai_not_configured') {
    return (
      <>
        Para ler as capturas do Swile, configure a chave e o modelo para imagens em{' '}
        <TextLink to="/configuracoes/ia">Inteligência artificial</TextLink>.
      </>
    );
  }
  if (error.code === 'ai_unreadable' || error.code === 'ai_unreachable') {
    const fileName = (error.details as { fileName?: string } | undefined)?.fileName;
    const failure = aiFailureOf(error.details);
    if (fileName && failure) {
      return <AiFailureNotice failure={failure} lead={`Não foi possível ler a captura ${fileName}. Nada foi importado.`} />;
    }
    if (fileName) return `Não foi possível ler a captura ${fileName}. Nada foi importado.`;
  }
  return error.message;
}

/** Why the file could not be chosen or imported: the pick's own refusal first, else the server's. */
export function UploadError({ pickError, error }: { pickError: string | null; error: ApiError | null }) {
  const content = pickError ?? (error ? errorContent(error) : null);
  if (!content) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {content}
    </p>
  );
}
