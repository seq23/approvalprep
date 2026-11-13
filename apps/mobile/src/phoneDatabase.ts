/** A failed SQLite worker must not leave the person waiting forever. */
export function storageDeadline<T>(work: Promise<T>, milliseconds = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('PHONE_STORAGE_UNAVAILABLE')), milliseconds);
    work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export function sharedDatabase<T>(open: (name: string) => Promise<T>, milliseconds = 8000) {
  const pending = new Map<string, Promise<T>>();
  return (name: string): Promise<T> => {
    let result = pending.get(name);
    if (!result) {
      result = storageDeadline(Promise.resolve().then(() => open(name)), milliseconds).catch(error => { pending.delete(name); throw error; });
      pending.set(name, result);
    }
    return result;
  };
}
export const phoneDatabase = sharedDatabase(async name => (await import('expo-sqlite')).openDatabaseAsync(name));
