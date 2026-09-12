/**
 * In-process write serialisation for the JSON content store.
 *
 * The store is a single document, so two concurrent read-modify-write cycles would otherwise clobber
 * each other (last write wins). Chaining writes through one promise keeps them ordered inside a
 * single Node process. This is *not* a cross-instance lock: with several serverless instances, or
 * once more than one person writes at a time, move the store to a real database (or add optimistic
 * versioning) — see README → Storage.
 */
let writeChain: Promise<unknown> = Promise.resolve();

export function withContentLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => undefined);
  return run;
}
