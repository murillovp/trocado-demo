import { normalizeName } from './text';

/** A CNPJ as banks print it: 12.345.678/0001-90. A CPF has no slash, and Nubank masks it. */
const CNPJ = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;

/**
 * True when a Pix line names a company: Nubank writes the company's CNPJ after
 * its name. A person's line carries a masked CPF or nothing, and Itaú writes no
 * number at all, so those stay false. Only company names may reach the AI (ADR-0011).
 */
export function isCompanyPix(rawDescription: string): boolean {
  return CNPJ.test(rawDescription);
}

/** A Nubank Pix, sent or received, also after "Estorno - " when the bank returns it. */
const NUBANK_PIX = /^(?:Estorno - )?Transferência (?:enviada|recebida) pelo Pix\b/i;
/** An Itaú Pix starts with the word PIX. */
const ITAU_PIX = /^PIX\s/;

/**
 * True when the text is a Pix of either bank, a refund of one included. Used
 * to keep a person's Pix name away from the AI whatever the line's other flags say.
 */
export function isPixDescription(rawDescription: string): boolean {
  return NUBANK_PIX.test(rawDescription) || ITAU_PIX.test(rawDescription);
}

/** "MARINA FICTICIA" is Marina, or Marina Paula, when the first word matches the first word of her name. */
export function isHouseholdPerson(counterparty: string, names: string[]): boolean {
  const firstWord = normalizeName(counterparty).split(' ')[0] ?? '';
  return names.some((name) => normalizeName(name).split(' ')[0] === firstWord);
}
