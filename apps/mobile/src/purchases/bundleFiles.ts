import { phoneDatabase } from '../phoneDatabase';
import { Platform } from 'react-native';
import { bundlePath, validBundleKits, type BundleReceipt } from './bundleDelivery';
/** Uses the same database/table as the kit door; each kit still has its own key. */
export async function installBundle(receipt: BundleReceipt): Promise<void> {
  if (!validBundleKits(receipt.kits)) throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE');
  if (Platform.OS === 'web') throw Error('NATIVE_DOWNLOAD_REQUIRED');
  const fs = await import('expo-file-system/legacy');
  if (!fs.documentDirectory) throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE');
  const destination = `${fs.documentDirectory}ApprovalPrep-bundle-${Date.now()}.zip`;
  const previous = await bundleFile();
  let downloaded;
  try { downloaded = await fs.downloadAsync(receipt.archiveUrl, destination); }
  catch (error) { await fs.deleteAsync(destination, { idempotent: true }); throw error; }
  const info = await fs.getInfoAsync(destination);
  if (downloaded.status !== 200 || !info.exists || info.isDirectory || info.size < 4 || !Object.entries(downloaded.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1].startsWith('application/zip')) {
    await fs.deleteAsync(destination, { idempotent: true });
    throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE');
  }
  const signature = await fs.readAsStringAsync(destination, { encoding: fs.EncodingType.Base64, position: 0, length: 4 });
  if (signature !== 'UEsDBA==') {
    await fs.deleteAsync(destination, { idempotent: true });
    throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE');
  }
  const db = await phoneDatabase('approvalprep-kit.db');
  try {
    await db.execAsync('CREATE TABLE IF NOT EXISTS delivered_kits (kit TEXT PRIMARY KEY NOT NULL, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS delivered_bundle (id INTEGER PRIMARY KEY CHECK (id = 1), uri TEXT NOT NULL);');
    await db.withExclusiveTransactionAsync(async tx => {
      for (const kit of receipt.kits) await tx.runAsync('INSERT INTO delivered_kits (kit, body) VALUES (?, ?) ON CONFLICT(kit) DO UPDATE SET body = excluded.body', kit.kit, JSON.stringify(kit));
      await tx.runAsync('INSERT INTO delivered_bundle (id, uri) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET uri = excluded.uri', destination);
    });
  } catch (error) { await fs.deleteAsync(destination, { idempotent: true }); throw error; }
  if (previous && previous !== destination) await fs.deleteAsync(previous, { idempotent: true }).catch(() => {});
}
export async function bundleFile(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const db = await phoneDatabase('approvalprep-kit.db');
  await db.execAsync('CREATE TABLE IF NOT EXISTS delivered_bundle (id INTEGER PRIMARY KEY CHECK (id = 1), uri TEXT NOT NULL);');
  const row = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM delivered_bundle WHERE id = 1');
  const fs = await import('expo-file-system/legacy');
  const uri = row ? bundlePath(row.uri, fs.documentDirectory) : null;
  return uri && (await fs.getInfoAsync(uri)).exists ? uri : null;
}
export async function shareBundle(): Promise<void> {
  const uri = await bundleFile();
  if (!uri) throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE');
  const sharing = await import('expo-sharing');
  if (!await sharing.isAvailableAsync()) throw Error('SHARING_UNAVAILABLE');
  await sharing.shareAsync(uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: 'Save your ApprovalPrep documents' });
}
