// A kit's website files (the PDF guide and the editable Word file) on this phone. The server checks
// the store purchase again before every download (functions/api/app-files.js); local state never
// authorizes a download. Nothing she types is sent: only RevenueCat's anonymous ID.
import { Platform } from 'react-native';
import { PREVIEW_ENABLED, previewOwns } from '../previewSamples';
import { FILES_ORIGIN, FILE_LABEL, FILE_TYPES, MIME, SIGNATURE, UTI, fileName, previewFilePage, validFileLinks, type FileType } from './kitFileLinks';
export { FILE_LABEL, FILE_TYPES, validFileLinks, type FileType } from './kitFileLinks';
export interface FileAccount { userId(): Promise<string> }
/** Downloads both files for a kit she owns; throws a code on any failure, leaving earlier files in place. */
export async function downloadKitFiles(sku: string, account: FileAccount): Promise<void> {
  if (Platform.OS === 'web') throw Error('NATIVE_DOWNLOAD_REQUIRED');
  const response = await fetch(`${FILES_ORIGIN}/api/app-files?kit=${encodeURIComponent(sku)}`, { method: 'POST', headers: { Authorization: `Bearer ${await account.userId()}` } });
  const data = await response.json();
  if (!response.ok) throw Error(data.stop || 'KIT_FILES_UNAVAILABLE');
  const links = validFileLinks(data, sku);
  if (!links) throw Error('KIT_FILES_UNAVAILABLE');
  const fs = await import('expo-file-system/legacy');
  if (!fs.documentDirectory) throw Error('KIT_FILES_UNAVAILABLE');
  for (const { type, url } of links) {
    const final = `${fs.documentDirectory}${fileName(sku, type)}`;
    const temporary = `${final}.part`;
    try {
      const downloaded = await fs.downloadAsync(url, temporary);
      const info = await fs.getInfoAsync(temporary);
      const signature = downloaded.status === 200 && info.exists && !info.isDirectory && info.size >= 4
        ? await fs.readAsStringAsync(temporary, { encoding: fs.EncodingType.Base64, position: 0, length: 4 }) : '';
      if (signature !== SIGNATURE[type]) throw Error('KIT_FILES_UNAVAILABLE');
      await fs.deleteAsync(final, { idempotent: true });
      await fs.moveAsync({ from: temporary, to: final });
    } catch (error) { await fs.deleteAsync(temporary, { idempotent: true }).catch(() => {}); throw error; }
  }
}

/** Which of the kit's files are on this phone. In the web preview, a pretend purchase counts. */
export async function kitFilesOnPhone(sku: string, productId: string): Promise<FileType[]> {
  if (Platform.OS === 'web') return PREVIEW_ENABLED && previewOwns(productId) ? [...FILE_TYPES] : [];
  const fs = await import('expo-file-system/legacy');
  if (!fs.documentDirectory) return [];
  const found: FileType[] = [];
  for (const type of FILE_TYPES) if ((await fs.getInfoAsync(`${fs.documentDirectory}${fileName(sku, type)}`)).exists) found.push(type);
  return found;
}

/** Opens one file: the share sheet on a phone (Files, Word, Mail), a new tab in the web preview. */
export async function openKitFile(sku: string, type: FileType): Promise<void> {
  if (Platform.OS === 'web') {
    if (!PREVIEW_ENABLED) throw Error('NATIVE_DOWNLOAD_REQUIRED');
    const url = URL.createObjectURL(new Blob([previewFilePage(sku, type)], { type: 'text/html' }));
    if (!window.open(url, '_blank')) throw Error('PREVIEW_TAB_BLOCKED');
    return;
  }
  const fs = await import('expo-file-system/legacy');
  const uri = `${fs.documentDirectory}${fileName(sku, type)}`;
  if (!fs.documentDirectory || !(await fs.getInfoAsync(uri)).exists) throw Error('KIT_FILES_UNAVAILABLE');
  const sharing = await import('expo-sharing');
  if (!await sharing.isAvailableAsync()) throw Error('SHARING_UNAVAILABLE');
  await sharing.shareAsync(uri, { mimeType: MIME[type], UTI: UTI[type], dialogTitle: `Save your ${FILE_LABEL[type]}` });
}
