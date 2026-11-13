// Web preview only. The browser store (expo-sqlite on OPFS) keeps every file open for one page at
// a time. If another tab, or the page just left, still holds them, the store's first open fails and
// its engine stays broken until the page is reloaded. So ask first, and open only when free.
const PROBE = `onmessage = async () => {
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('expo-sqlite');
    for await (const entry of dir.values()) {
      if (entry.kind !== 'file') continue;
      (await entry.createSyncAccessHandle()).close();
      break;
    }
    postMessage(true);
  } catch (error) { postMessage(error && error.name === 'NotFoundError'); }
};`;
function filesFree() {
  return new Promise<boolean>(resolve => {
    const url = URL.createObjectURL(new Blob([PROBE], { type: 'text/javascript' }));
    const worker = new Worker(url);
    const done = (free: boolean) => { worker.terminate(); URL.revokeObjectURL(url); resolve(free); };
    worker.onmessage = event => done(event.data === true);
    worker.onerror = () => done(false);
    worker.postMessage(0);
  });
}
let mine: Promise<boolean> | undefined;
/** This tab's turn: held until the page goes away, so a second tab waits instead of breaking the store. */
function myTurn() {
  if (typeof navigator === 'undefined' || !navigator.locks) return Promise.resolve(true);
  return new Promise<boolean>(resolve => {
    void navigator.locks.request('approvalprep-phone-store', { ifAvailable: true }, lock => {
      resolve(!!lock);
      return lock ? new Promise(() => {}) : undefined;
    }).catch(() => resolve(true));
  });
}
export async function storeFree() {
  if (!mine) mine = myTurn();
  if (!await mine) { mine = undefined; return false; }
  return filesFree();
}
