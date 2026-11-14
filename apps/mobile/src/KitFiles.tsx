// "Your files" on a kit screen she owns: the website kit's PDF guide and Word file, opened with
// the phone's share sheet (Files, Word, Mail). One block, used by every kit screen.
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button, Sheet } from './ui';
import { type } from './theme';
import { FILE_LABEL, FILE_TYPES, downloadKitFiles, kitFilesOnPhone, openKitFile, type FileType } from './purchases/kitFiles';
import { bundleAccount } from './purchases/bundleAccount';
export function KitFiles({ sku, productId, name, primary = false }: { sku: string; productId: string; name: string; primary?: boolean }) {
  const [files, setFiles] = useState<FileType[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = useCallback(() => {
    let active = true;
    kitFilesOnPhone(sku, productId).then(found => { if (active) setFiles(found); }).catch(() => {});
    return () => { active = false; };
  }, [sku, productId]);
  useFocusEffect(refresh);
  async function download() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await downloadKitFiles(sku, await bundleAccount()); setFiles(await kitFilesOnPhone(sku, productId)); setMessage('Both files are saved on this phone.'); }
    catch (error) {
      const code = error instanceof Error ? error.message : '';
      console.warn('Kit files download failed', code);
      setMessage(code === 'NATIVE_DOWNLOAD_REQUIRED' ? 'The files download in the phone app.' : 'The files could not be downloaded. Try again when you are online. You do not need to buy the kit again.');
    } finally { setBusy(false); }
  }
  async function open(fileType: FileType) {
    setMessage('');
    try { await openKitFile(sku, fileType); }
    catch { setMessage('The file could not be opened. Tap Download the files to get it again.'); }
  }
  return <Sheet>
    <Text style={type.subhead}>{`Your files: the ${name}`}</Text>
    <Text style={type.sub}>The same PDF guide and editable Word file the website delivers. They open in Files or Word.</Text>
    {files.length === FILE_TYPES.length
      ? FILE_TYPES.map((fileType, n) => <Button key={fileType} primary={primary && n === 0} label={`Open the ${FILE_LABEL[fileType]} ›`} onPress={() => void open(fileType)} />)
      : <Button primary={primary} disabled={busy} label={busy ? 'Downloading…' : 'Download the files ›'} onPress={() => void download()} />}
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
  </Sheet>;
}
