import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { exportLetter } from './letterPdf';
export const saveOrPrintLetter = (html: string, action: 'save' | 'print') => exportLetter(html, action, {
  web: Platform.OS === 'web',
  print: async html => { await Print.printAsync({ html }); },
  create: async html => (await Print.printToFileAsync({ html })).uri,
  canShare: () => Sharing.isAvailableAsync(),
  share: uri => Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save or share your letter' }),
});
