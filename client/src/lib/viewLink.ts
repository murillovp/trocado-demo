/** The address parameters that carry the month on screen and whose numbers these are. */
export const MONTH_PARAM = 'mes';
export const PERSON_PARAM = 'pessoa';

/**
 * Adds the month and the person to an address inside the app, unless it already
 * names them. A link built this way opens the next screen on the same view.
 * Without a `month` (the app has not decided it yet) the address gets no month,
 * so the link does not lock in a month nobody chose.
 */
export function withView(path: string, view: { month?: string; scope: string }): string {
  if (!path.startsWith('/')) return path;
  const [base = '', query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  if (view.month !== undefined && !params.has(MONTH_PARAM)) params.set(MONTH_PARAM, view.month);
  if (!params.has(PERSON_PARAM)) params.set(PERSON_PARAM, view.scope);
  return `${base}?${params.toString()}`;
}
