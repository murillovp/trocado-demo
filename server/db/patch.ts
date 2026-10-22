/** Drops keys the caller left out, so an empty patch never reaches Drizzle. */
export function definedEntries<T extends object>(patch: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
