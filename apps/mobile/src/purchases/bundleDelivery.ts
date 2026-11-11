import { KIT_KINDS, parseKitTemplates } from '../kitTemplates';
import type { BundleOwnership } from './bundleOffers';
export const BUNDLE_ORIGIN = 'https://approvalprep.com';
export interface BundleReceipt { archiveUrl: string; kits: { kit: string; version: number; letters: unknown[] }[] }
const explanationKinds = ['credit', 'income-gap', 'employment-gap', 'address-history', 'rental-issue', 'late-payment', 'bank-statement', 'life-event', 'general-application'].map(kind => `explanation-${kind}`);
export function validBundleKits(kits: unknown): kits is BundleReceipt['kits'] {
  if (!Array.isArray(kits) || kits.length !== 2) return false;
  return ['credit-letter-kit', 'letter-of-explanation-kit'].every(id => {
    const kit = kits.find(k => k?.kit === id);
    const expected = id === 'credit-letter-kit' ? KIT_KINDS : explanationKinds;
    return kit && Number.isInteger(kit.version) && kit.version > 0 && Array.isArray(kit.letters) && kit.letters.length === expected.length
      && expected.every(kind => kit.letters.filter((letter: { kind?: string }) => letter?.kind === kind).length === 1)
      // Reuse the shipped parser for questions/tokens while the explanation PR is held.
      && kit.letters.every((letter: object) => !!parseKitTemplates({ version: kit.version, kit: 'credit-letter-kit', letters: [{ ...letter, kind: 'goodwill' }] }));
  });
}
export interface BundleAccount { restore(): Promise<BundleOwnership>; userId(): Promise<string> }
/** Local state never authorizes delivery: the server verifies the store purchase again. */
export async function restoreBundle(account: BundleAccount, install: (receipt: BundleReceipt) => Promise<void>): Promise<boolean> {
  if (!(await account.restore()).bundle) return false;
  const response = await fetch(`${BUNDLE_ORIGIN}/api/app-bundle`, { method: 'POST', headers: { Authorization: `Bearer ${await account.userId()}` } });
  const data = await response.json();
  if (!response.ok) throw Error(data.stop || 'BUNDLE_DOWNLOAD_UNAVAILABLE');
  const url = new URL(data.archiveUrl);
  if (url.origin !== BUNDLE_ORIGIN || url.pathname !== '/api/app-bundle-file') throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE');
  if (!validBundleKits(data.kits)) throw Error('BUNDLE_DOWNLOAD_UNAVAILABLE');
  await install({ archiveUrl: url.href, kits: data.kits });
  return true;
}
