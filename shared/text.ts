/**
 * One way to compare names typed by different banks: no accents, one space
 * between words, upper case. "Marina Fictícia" and "MARINA FICTICIA" come out equal.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** The ids in a comma-separated list, trimmed, with blanks and repeats dropped. An empty or missing list gives none. */
export function splitIdList(text: string | undefined): string[] {
  if (!text) return [];
  return [...new Set(text.split(',').map((id) => id.trim()).filter((id) => id !== ''))];
}
