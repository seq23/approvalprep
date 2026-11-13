import { storeFree } from './storeFree';
/** A failed SQLite worker must not leave the person waiting forever. */
export function storageDeadline<T>(work: Promise<T>, milliseconds = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('PHONE_STORAGE_UNAVAILABLE')), milliseconds);
    work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
/** One line in the console with the real reason, so a storage failure is never silent. */
export function reportStorageFailure(what: string, error: unknown) {
  console.error(`Phone storage failed (${what}): ${error instanceof Error ? error.message : String(error)}`);
}
export function sharedDatabase<T>(open: (name: string) => Promise<T>, milliseconds = 8000) {
  const pending = new Map<string, Promise<T>>();
  // One open at a time. On web, expo-sqlite sets up its SQLite engine inside the first open; two
  // databases opened together (letters + kits on the Start screen) each set up their own engine,
  // the second replaced the first, and every later query on the first database failed.
  let last: Promise<unknown> = Promise.resolve();
  return (name: string): Promise<T> => {
    let result = pending.get(name);
    if (!result) {
      // The limit starts when this open's turn does, so a stalled open cannot hold the queue.
      const turn = last.then(() => storageDeadline(Promise.resolve().then(() => open(name)), milliseconds));
      last = turn.catch(() => {});
      result = turn.catch(error => { pending.delete(name); reportStorageFailure(`open ${name}`, error); throw error; });
      pending.set(name, result);
    }
    return result;
  };
}
/**
 * Never start the store while its files are held elsewhere (another tab, or the page just left):
 * a first open that fails that way leaves the web store broken until the page is reloaded.
 * Asks a few times, then fails without touching the store, so "Try again" can still succeed.
 */
export function openWhenFree<T>(free: () => Promise<boolean>, open: (name: string) => Promise<T>, tries = 20, pause = 150) {
  let started = false;
  return async (name: string): Promise<T> => {
    for (let attempt = 1; !started; attempt++) {
      if (await free()) { started = true; break; }
      if (attempt >= tries) throw Error('PHONE_STORAGE_BUSY: the saved letters are open in another tab or window');
      await new Promise(resolve => setTimeout(resolve, pause));
    }
    return open(name);
  };
}
export const phoneDatabase = sharedDatabase(openWhenFree(storeFree, async name => (await import('expo-sqlite')).openDatabaseAsync(name)));
