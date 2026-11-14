import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { exportLetter, pdfFileName, PAGE_MARGIN_PT } from './letterPdf';
// iOS printing ignores CSS @page margins, so the paper margin is handed to the printer as well.
const margins = { top: PAGE_MARGIN_PT, bottom: PAGE_MARGIN_PT, left: PAGE_MARGIN_PT, right: PAGE_MARGIN_PT };
/** title: what the letter is ("Credit bureau dispute letter"); the shared file is named after it and today's date. */
export const saveOrPrintLetter = (html: string, action: 'save' | 'print', title = 'Your letter') => exportLetter(html, action, {
  web: Platform.OS === 'web',
  print: async html => { await Print.printAsync({ html, margins }); },
  create: async (html, fileName) => {
    const { uri } = await Print.printToFileAsync({ html, margins });
    // The printer names its file with a random id; she shares a file called after the letter.
    try {
      const fs = await import('expo-file-system/legacy');
      const dir = `${fs.cacheDirectory}letters/`;
      await fs.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const named = `${dir}${encodeURIComponent(fileName)}`;
      await fs.deleteAsync(named, { idempotent: true });
      await fs.moveAsync({ from: uri, to: named });
      return named;
    } catch { return uri; }
  },
  canShare: () => Sharing.isAvailableAsync(),
  share: uri => Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save or share your letter' }),
}, pdfFileName(title));
