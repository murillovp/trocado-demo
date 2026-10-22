import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { saveSettings } from '@/api/endpoints';
import { useChange, useSettings, useVendors } from '@/api/queries';
import { Field } from '@/components/Field';
import { ReclassifyButton } from '@/components/ReclassifyButton';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { PageHeader } from '@/components/PageHeader';
import { QueryView } from '@/components/QueryView';
import { CardSkeleton } from '@/components/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { plural } from '@/lib/format';
import { isSuggested } from '@/lib/vendors';

const SENT = [
  'O nome do fornecedor, como o banco escreveu',
  'Até 50 fornecedores já confirmados, como exemplo',
  'A lista de categorias',
  'As capturas do Swile, inteiras, com valores, datas e horários. Só quando você importa capturas.',
];
const NEVER_SENT = ['Valores, datas e saldos dos extratos CSV e PDF', 'Nomes de pessoas em Pix, CPF e número de conta'];

export function IaPage() {
  const settings = useSettings();
  const header = (
    <PageHeader
      eyebrow="Configurações"
      title="Inteligência artificial"
      intro="Ela só entra quando aparece um fornecedor que o Trocado nunca viu. Fornecedor conhecido nunca é enviado. A exceção são as capturas do Swile: a IA lê a imagem inteira."
    />
  );
  return (
    <QueryView query={settings} header={header}>
      {(data) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <AiForm settings={data} />
          <div className="flex flex-col gap-4">
            <PrivacyCard />
            <WorkCard />
          </div>
        </div>
      )}
    </QueryView>
  );
}

function AiForm({ settings }: { settings: Record<string, string> }) {
  const [baseUrl, setBaseUrl] = useState(settings.ai_base_url ?? '');
  const [model, setModel] = useState(settings.ai_model ?? '');
  const [visionModel, setVisionModel] = useState(settings.ai_vision_model ?? '');
  const [key, setKey] = useState('');
  const keyStored = settings.ai_api_key_set === 'true';
  const ready = keyStored && Boolean(settings.ai_model);

  const save = useChange((values: Record<string, string>) => saveSettings(values), {
    onSuccess: () => {
      toast.success('Configuração salva.');
      setKey('');
    },
  });

  return (
    <SectionCard>
      <SectionHeader title="Conexão com a IA" />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate({
            ai_base_url: baseUrl.trim(),
            ai_model: model.trim(),
            ai_vision_model: visionModel.trim(),
            ...(key.trim() ? { ai_api_key: key.trim() } : {}),
          });
        }}
      >
        <Field label="Endereço do provedor" hint="Vazio usa o OpenRouter.">
          <Input placeholder="https://openrouter.ai/api/v1" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </Field>
        <Field label="Modelo" hint="Modelos baratos custam menos de um centavo por mês aqui.">
          <Input placeholder="deepseek/deepseek-v4-flash" value={model} onChange={(event) => setModel(event.target.value)} />
        </Field>
        <Field
          label="Modelo para imagens"
          hint='Usado só para ler as capturas do Swile. Precisa aceitar imagens, por exemplo inclusionai/ling-3.0-flash-vl.'
        >
          <Input placeholder="inclusionai/ling-3.0-flash-vl" value={visionModel} onChange={(event) => setVisionModel(event.target.value)} />
        </Field>
        <Field
          label="Chave"
          hint={keyStored ? 'Chave guardada. Deixe vazio para manter a chave atual.' : 'A chave fica só neste computador e nunca volta para a tela.'}
        >
          <Input type="password" autoComplete="off" value={key} onChange={(event) => setKey(event.target.value)} />
        </Field>
        {keyStored ? <span className="text-sm">Chave guardada.</span> : null}
        <Button type="submit" className="self-start" loading={save.isPending}>
          Salvar
        </Button>
        <p className="text-sm text-muted-foreground">
          {ready
            ? 'Pronta. Fornecedores novos ganham apelido e categoria na importação.'
            : 'Sem chave e modelo, o Trocado importa normalmente, mas os fornecedores novos ficam sem categoria.'}
        </p>
      </form>
    </SectionCard>
  );
}

function PrivacyCard() {
  return (
    <SectionCard>
      <SectionHeader title="O que sai daqui" />
      <ul className="flex flex-col gap-1.5 text-sm">
        {SENT.map((text) => (
          <li key={text} className="flex items-center gap-2">
            <Check aria-hidden="true" className="size-4" /> {text}
          </li>
        ))}
      </ul>
      <h3 className="text-sm font-semibold">O que nunca sai</h3>
      <ul className="flex flex-col gap-1.5 text-sm">
        {NEVER_SENT.map((text) => (
          <li key={text} className="flex items-center gap-2">
            <X aria-hidden="true" className="size-4" /> {text}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function WorkCard() {
  const vendors = useVendors();

  return (
    <SectionCard>
      <QueryView
        query={vendors}
        header={<SectionHeader title="O que a IA já fez" />}
        loading={<CardSkeleton />}
        inline
        className="flex flex-col gap-4"
      >
        {(data) => (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              <li>{plural(data.filter((vendor) => vendor.confirmed).length, 'fornecedor confirmado', 'fornecedores confirmados')}</li>
              <li>
                {plural(data.filter(isSuggested).length, 'sugestão da IA ainda sem revisão', 'sugestões da IA ainda sem revisão')}
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">Linhas que ficaram sem categoria porque a IA não respondeu podem ser pedidas de novo.</p>
          </>
        )}
      </QueryView>
      <ReclassifyButton />
    </SectionCard>
  );
}
