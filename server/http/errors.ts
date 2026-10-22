import type { NextFunction, Request, Response } from 'express';
import type { ServerErrorCode } from '../../shared/errorCodes';
import { AppError } from '../../shared/errors';
import { LIMIT_MESSAGES } from '../../shared/limits';
import type { BatchRefusal } from '../services/lines/batchLines';

type ErrorText = {
  status: number;
  message: string;
  /** Builds a more specific message from the error's details, when they allow it. */
  describe?: (details: unknown) => string | null;
};

const FORMAT_LABELS: Record<string, string> = {
  nubank_checking_csv: 'extrato da conta Nubank (CSV)',
  nubank_card_csv: 'fatura do cartão Nubank (CSV)',
  itau_checking_pdf: 'extrato da conta Itaú (PDF)',
};

const FALLBACK: ErrorText = {
  status: 500,
  message: 'Erro inesperado no servidor. Tente de novo; se continuar, reinicie o Trocado e veja a mensagem no terminal.',
};

/** Every server error code has a status and a PT-BR message; the type fails if one is missing. */
export const PT_BR_MESSAGES: Record<ServerErrorCode, ErrorText> = {
  internal: FALLBACK,
  not_found: { status: 404, message: 'Endereço não encontrado.' },
  category_name_taken: { status: 409, message: 'Já existe uma categoria com esse nome.' },
  category_not_found: { status: 404, message: 'Categoria não encontrada.' },
  category_order_invalid: {
    status: 400,
    message: 'A lista de categorias mudou. Recarregue a página e tente de novo.',
  },
  category_wrong_kind: { status: 400, message: 'Essa categoria não serve para esse tipo de lançamento.' },
  kind_wrong_direction: {
    status: 400,
    message: 'Dinheiro que saiu não pode ser Entrada. Se ele voltou para alguém, marque como Fora dos totais.',
  },
  batch_refused: {
    status: 400,
    message: 'Alguns lançamentos não aceitam essa mudança. Nada foi alterado.',
    describe: (details) => describeBatchRefusal(details as BatchRefusal | undefined),
  },
  person_name_taken: { status: 409, message: 'Já existe uma pessoa com esse nome.' },
  household_not_found: { status: 404, message: 'Casa não encontrada.' },
  bucket_label_taken: { status: 409, message: 'Cada grupo precisa de um nome diferente.' },
  person_not_found: { status: 404, message: 'Pessoa não encontrada.' },
  tag_name_taken: { status: 409, message: 'Já existe uma tag com esse nome.' },
  tag_not_found: { status: 404, message: 'Tag não encontrada.' },
  month_invalid: { status: 400, message: 'Mês inválido. Use o formato AAAA-MM, como 2026-08.' },
  budget_target_out_of_range: {
    status: 400,
    message: 'A meta precisa ser um número entre 0 e 100.',
  },
  reference_income_invalid: { status: 400, message: 'A renda de referência precisa ser positiva.' },
  invalid_request: {
    status: 400,
    message: 'Os dados enviados são inválidos.',
    describe: (details) => {
      // Zod issues that broke a limit carry a PT-BR message that names the field.
      if (!Array.isArray(details)) return null;
      const issue = details.find((item) => LIMIT_MESSAGES.has((item as { message?: string } | null)?.message ?? ''));
      return issue ? (issue as { message: string }).message : null;
    },
  },
  amount_unreadable: {
    status: 422,
    message: 'Não foi possível ler um valor do arquivo.',
    describe: (details) => {
      const { value, lineNumber } = (details ?? {}) as { value?: string; lineNumber?: number };
      if (!value || !lineNumber) return null;
      return `Não foi possível ler o valor "${value}" na linha ${lineNumber} do arquivo.`;
    },
  },
  file_repeats_line: {
    status: 422,
    message: 'O arquivo tem a mesma linha duas vezes. Baixe o extrato de novo e tente outra vez.',
    describe: (details) => {
      const { lineNumber } = (details ?? {}) as { lineNumber?: number };
      if (!lineNumber) return null;
      return `O arquivo tem a mesma linha duas vezes (linha ${lineNumber}). Baixe o extrato de novo e tente outra vez.`;
    },
  },
  date_unreadable: { status: 422, message: 'Não foi possível ler uma data do arquivo.' },
  format_unknown: {
    status: 415,
    message:
      'O Trocado não reconhece esse arquivo. Envie o extrato da conta Nubank (CSV), a fatura do cartão Nubank (CSV), o extrato da conta Itaú (PDF) ou capturas do extrato Swile.',
  },
  file_unreadable: {
    status: 422,
    message: 'Não foi possível ler o arquivo. Nada foi salvo.',
    describe: (details) => {
      const { format, lineNumber } = (details ?? {}) as { format?: string; lineNumber?: number };
      if (!format || !lineNumber) return null;
      return `Não foi possível ler a linha ${lineNumber} do ${FORMAT_LABELS[format] ?? 'arquivo'}. Nada foi salvo.`;
    },
  },
  format_account_mismatch: {
    status: 422,
    message: 'Esse arquivo não é dessa conta. Confira a conta escolhida.',
  },
  account_not_found: { status: 404, message: 'Conta não encontrada.' },
  account_label_taken: { status: 409, message: 'Já existe uma conta com esse nome.' },
  vendor_not_found: { status: 404, message: 'Fornecedor não encontrado.' },
  vendor_rule_taken: { status: 409, message: 'Já existe um fornecedor com essa regra.' },
  import_not_found: { status: 404, message: 'Importação não encontrada.' },
  import_image_not_found: { status: 404, message: 'Captura não encontrada.' },
  import_already_confirmed: { status: 409, message: 'Essa importação já foi confirmada.' },
  import_has_dependents: {
    status: 409,
    message: 'Outra importação usa linhas desta. Cancele aquela primeiro ou confirme esta.',
  },
  transaction_not_found: { status: 404, message: 'Lançamento não encontrado.' },
  date_invalid: { status: 400, message: 'Data inválida. Use o formato AAAA-MM-DD, como 2026-08-20.' },
  transaction_pending_review: {
    status: 409,
    message: 'Esse lançamento ainda está numa importação em revisão. Revise e confirme a importação primeiro.',
  },
  transaction_not_manual: { status: 409, message: 'Só lançamentos adicionados à mão podem ser apagados.' },
  ai_unreachable: {
    status: 502,
    message: 'Não foi possível falar com a IA agora. Tente de novo mais tarde.',
  },
  ai_unreadable: { status: 502, message: 'Não foi possível ler a captura.' },
  ai_not_configured: {
    status: 422,
    message: 'Configure a chave e o modelo para imagens em Inteligência artificial.',
  },
  payload_too_large: {
    status: 413,
    message: 'O envio passou do limite. Envie menos capturas de cada vez.',
  },
};

/** "1 lançamento é" or "3 lançamentos são", then the rest of the sentence in either number. */
function countedLines(count: number, one: string, many: string): string {
  return count === 1 ? `1 lançamento ${one}` : `${count} lançamentos ${many}`;
}

/**
 * The `batch_refused` text: how many lines refused and why, one sentence per
 * reason. Null when the details do not name a reason, so the general text stays.
 */
function describeBatchRefusal(details: BatchRefusal | undefined): string | null {
  if (!details) return null;
  const sentences: string[] = [];
  if (details.outgoingAsIncome > 0) {
    sentences.push(`${countedLines(details.outgoingAsIncome, 'é saída de dinheiro e não pode', 'são saídas de dinheiro e não podem')} ser Entrada.`);
  }
  if (details.categoryMismatch > 0) {
    sentences.push(
      details.change === 'category'
        ? `${countedLines(details.categoryMismatch, 'tem um tipo que não combina', 'têm um tipo que não combina')} com essa categoria.`
        : `${countedLines(details.categoryMismatch, 'tem uma categoria que não combina', 'têm uma categoria que não combina')} com esse tipo.`,
    );
  }
  return sentences.length > 0 ? sentences.join(' ') : null;
}

/** The `invalid_request` text for a body that is not valid JSON, where no field can be named. */
const MALFORMED_JSON_MESSAGE = 'O pedido chegou incompleto. Recarregue a página e tente de novo.';

/**
 * Codes whose `details` the client actually reads (e.g. which screenshot
 * failed). Every other code keeps the old `{ code, message }` shape, so a
 * future `new AppError(code, msg, { rawRow })` never ships internal data to
 * the browser by accident.
 */
const DETAILS_SENT_TO_CLIENT = new Set<ServerErrorCode>(['ai_unreadable', 'ai_unreachable']);

/** Codes that name an AI provider failure: one log line, never the client-facing message. */
const AI_FAILURE_CODES = new Set<ServerErrorCode>(['ai_unreadable', 'ai_unreachable']);

/**
 * The status and JSON body for any error, with the same logging and the same
 * rule about which `details` reach the browser. Used by `errorHandler` and by
 * the import progress stream, so both answer a failure identically.
 */
export function errorResponse(error: unknown): {
  status: number;
  body: { error: { code: ServerErrorCode; message: string; details?: unknown } };
} {
  if (error instanceof AppError) {
    if (AI_FAILURE_CODES.has(error.code)) {
      const details = (error.details ?? {}) as { reason?: unknown; status?: unknown };
      console.warn('AI failure', { code: error.code, reason: details.reason, status: details.status });
    }
    const mapped = PT_BR_MESSAGES[error.code];
    const message = mapped.describe?.(error.details) ?? mapped.message;
    const body: { code: ServerErrorCode; message: string; details?: unknown } = { code: error.code, message };
    if (DETAILS_SENT_TO_CLIENT.has(error.code)) body.details = error.details;
    return { status: mapped.status, body: { error: body } };
  }
  if (isMalformedJson(error)) {
    return { status: 400, body: { error: { code: 'invalid_request', message: MALFORMED_JSON_MESSAGE } } };
  }
  if (isPayloadTooLarge(error)) {
    const mapped = PT_BR_MESSAGES.payload_too_large;
    return { status: mapped.status, body: { error: { code: 'payload_too_large', message: mapped.message } } };
  }
  console.error(error);
  return { status: FALLBACK.status, body: { error: { code: 'internal', message: FALLBACK.message } } };
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  const { status, body } = errorResponse(error);
  response.status(status).json(body);
}

/** Express's body-parser error when a request body is over the configured `express.json({ limit })`. */
function isPayloadTooLarge(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { type?: unknown }).type === 'entity.too.large' &&
    (error as { status?: unknown }).status === 413
  );
}

/** Express's body-parser error when a request body is not valid JSON. */
function isMalformedJson(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { type?: unknown }).type === 'entity.parse.failed';
}
