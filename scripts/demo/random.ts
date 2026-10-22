/** A small seeded random source, so the demo data comes out the same on every build. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** A whole number from `min` to `max`, both included. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** A price in cents between two prices in reais, ending in a plausible cent value. */
    cents: (minReais: number, maxReais: number) => Math.round((minReais + next() * (maxReais - minReais)) * 100),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
  };
}

export type Random = ReturnType<typeof createRandom>;
