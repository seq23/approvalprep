import type { PurchasesProvider } from './provider';
import { KIT_KINDS, parseKitTemplates, type KitTemplates } from '../kitTemplates';
const ORIGIN = 'https://approvalprep.com';
// No answers or letter text ever leave the phone. Only RevenueCat's anonymous ID is sent.
export async function restoreKit(provider: PurchasesProvider, save: (kit: KitTemplates) => Promise<boolean>): Promise<boolean> {
  if (!(await provider.restore()).creditKit) return false;
  const response = await fetch(`${ORIGIN}/api/app-unlock`, { method: 'POST', headers: { Authorization: `Bearer ${await provider.userId()}` } });
  const result = await response.json();
  if (!response.ok) throw Error(result.stop || 'KIT_DOWNLOAD_UNAVAILABLE');
  const url = new URL(result.url);
  if (url.origin !== ORIGIN || url.pathname !== '/api/app-kit-file') throw Error('KIT_DOWNLOAD_UNAVAILABLE');
  const file = await fetch(url.href);
  if (!file.ok) throw Error('KIT_DOWNLOAD_UNAVAILABLE');
  const kit = parseKitTemplates(await file.json());
  if (!kit || KIT_KINDS.some(kind => !kit.letters.some(letter => letter.kind === kind)) || !await save(kit)) throw Error('KIT_DOWNLOAD_UNAVAILABLE');
  return true;
}
