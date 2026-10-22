import type { JSX } from 'react';
import type { AiFailure } from '@/api/types';
import { TextLink } from '@/components/TextLink';

type Texts = { problem: string; next: string; hasFix: boolean };

const REASONS = new Set<AiFailure['reason']>(['busy', 'model', 'key', 'credit', 'network', 'timeout', 'unreadable', 'provider']);

/**
 * What happened and what to do, per failure reason. `hasFix` marks the
 * reasons whose fix lives in Inteligência artificial (all but "network",
 * which is about the connection, not the AI setup).
 */
const TEXTS: Record<AiFailure['reason'], Texts> = {
  busy: {
    problem: 'O modelo de IA está ocupado agora: o provedor limitou o uso.',
    next: 'Tente de novo em alguns minutos ou escolha outro modelo.',
    hasFix: true,
  },
  model: {
    problem: 'O modelo escolhido não existe ou não aceita esse pedido (por exemplo, não lê imagens).',
    next: 'Escolha outro modelo.',
    hasFix: true,
  },
  key: {
    problem: 'O provedor recusou a chave de IA.',
    next: 'Confira a chave.',
    hasFix: true,
  },
  credit: {
    problem: 'A conta no OpenRouter está sem crédito.',
    next: 'Adicione crédito no OpenRouter ou escolha um modelo mais barato.',
    hasFix: true,
  },
  network: {
    problem: 'Não foi possível falar com o provedor de IA.',
    next: 'Confira a internet e tente de novo.',
    hasFix: false,
  },
  timeout: {
    problem: 'A IA demorou demais para responder.',
    next: 'Tente de novo ou escolha outro modelo.',
    hasFix: true,
  },
  unreadable: {
    problem: 'A IA respondeu, mas a resposta veio num formato que o Trocado não entende.',
    next: 'Tente de novo ou escolha outro modelo.',
    hasFix: true,
  },
  provider: {
    problem: 'O provedor de IA teve um erro.',
    next: 'Tente de novo mais tarde ou escolha outro modelo.',
    hasFix: true,
  },
};

/** Reads an AiFailure out of unknown error details, or null. */
export function aiFailureOf(details: unknown): AiFailure | null {
  if (typeof details !== 'object' || details === null) return null;
  const { reason, status, providerMessage } = details as Record<string, unknown>;
  if (typeof reason !== 'string' || !REASONS.has(reason as AiFailure['reason'])) return null;
  if (status !== null && typeof status !== 'number') return null;
  if (providerMessage !== null && typeof providerMessage !== 'string') return null;
  return { reason: reason as AiFailure['reason'], status: status ?? null, providerMessage: providerMessage ?? null };
}

/** What happened and what to do, as PT-BR text. */
export function aiFailureText(failure: AiFailure): { problem: string; next: string } {
  const { problem, next } = TEXTS[failure.reason];
  return { problem, next };
}

/**
 * A block with the problem, the next step, a link to Inteligência
 * artificial when the fix lives there, and the provider's own message in
 * small grey text when present.
 */
export function AiFailureNotice({ failure, lead }: { failure: AiFailure; lead?: string }): JSX.Element {
  const { problem, next, hasFix } = TEXTS[failure.reason];
  return (
    <>
      {lead ? `${lead} ` : null}
      {problem} {next}
      {hasFix ? (
        <>
          {' '}
          <TextLink to="/configuracoes/ia">
            Abrir Inteligência artificial
          </TextLink>
          .
        </>
      ) : null}
      {failure.providerMessage ? (
        <span className="block text-xs text-muted-foreground">Detalhe do provedor: {failure.providerMessage}</span>
      ) : null}
    </>
  );
}
