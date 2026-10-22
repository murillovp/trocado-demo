/**
 * A module-level queue that runs one `work` call at a time, in call order.
 * Two concurrent imports both read dedupe keys and open transfer candidates
 * before writing, so running them side by side can make each miss the
 * other's lines, or hit the account's unique dedupe index. Serializing the
 * whole import trades that race for a short wait.
 */
let queue: Promise<void> = Promise.resolve();

export function runSerially<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
