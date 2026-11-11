import type { PurchasesProvider } from './provider';
import { KIT_ID, EXPLANATION_KIT_ID, kindsForKit, parseKitTemplates, type KitTemplates } from '../kitTemplates';
const ORIGIN = 'https://approvalprep.com';
// No answers or letter text ever leave the phone. Only RevenueCat's anonymous ID is sent.
export async function restoreKit(provider: PurchasesProvider, save: (kit: KitTemplates) => Promise<boolean>): Promise<boolean> {
  const owned = await provider.restore();
  let restored = false;
  const failures: unknown[] = [];
  for (const kitId of [KIT_ID, EXPLANATION_KIT_ID] as const) {
    if (!(kitId === KIT_ID ? owned.creditKit : owned.explanationKit)) continue;
    try {
      const response = await fetch(`${ORIGIN}/api/app-unlock?kit=${kitId}`, { method: 'POST', headers: { Authorization: `Bearer ${await provider.userId()}` } });
      const result = await response.json();
      if (!response.ok) throw Error(result.stop || 'KIT_DOWNLOAD_UNAVAILABLE');
      const url = new URL(result.url);
      if (url.origin !== ORIGIN || url.pathname !== '/api/app-kit-file') throw Error('KIT_DOWNLOAD_UNAVAILABLE');
      const file = await fetch(url.href);
      if (!file.ok) throw Error('KIT_DOWNLOAD_UNAVAILABLE');
      const kit = parseKitTemplates(await file.json());
      if (!kit || kit.kit !== kitId || kindsForKit(kitId).some(kind => !kit.letters.some(letter => letter.kind === kind)) || !await save(kit)) throw Error('KIT_DOWNLOAD_UNAVAILABLE');
      restored = true;
    } catch (error) { failures.push(error); }
  }
  if (failures.length) {
    if (!restored) throw failures[0];
    throw Error('KIT_RESTORE_PARTIAL');
  }
  return restored;
}
