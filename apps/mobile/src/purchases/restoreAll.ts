import type { Entitlement, PurchasesProvider } from './provider';
import type { BundleAccount, BundleReceipt } from './bundleDelivery';
import type { KitTemplates } from '../kitTemplates';
import type { BundleOwnership } from './bundleOffers';
import type { FileAccount } from './kitFiles';
import { fileKitByProduct } from '../kit';
// "Restore a purchase" on More does what its line says: it asks the store account for the bundle
// and for each kit, and puts back whatever it finds. Nothing to choose first.
export interface RestoreDeps {
  provider(): Promise<PurchasesProvider>;
  account(): Promise<BundleAccount>;
  restoreKit(provider: PurchasesProvider, save: (kit: KitTemplates) => Promise<boolean>, bought?: Entitlement): Promise<boolean>;
  restoreBundle(account: BundleAccount, install: (receipt: BundleReceipt) => Promise<void>): Promise<boolean>;
  saveKit(kit: KitTemplates): Promise<boolean>;
  installBundle(receipt: BundleReceipt): Promise<void>;
  /** The file-only kits she owns, downloaded again; true when at least one came back. */
  restoreFiles?(): Promise<boolean>;
}
/** Each file kit the store account owns on its own is downloaded again; one failure never hides the others. */
export async function restoreFileKits(account: { restore(): Promise<BundleOwnership> } & FileAccount, download: (sku: string, account: FileAccount) => Promise<void>): Promise<boolean> {
  const owned = await account.restore();
  if (owned.bundle) return false;
  let restored = false; let failed: unknown = null;
  for (const id of owned.fileKits ?? []) {
    const kit = fileKitByProduct(id);
    if (!kit) continue;
    try { await download(kit.sku, account); restored = true; } catch (error) { failed = error; }
  }
  if (failed) throw restored ? Error('KIT_RESTORE_PARTIAL') : failed;
  return restored;
}
export type Restored = 'bundle' | 'kits' | 'none';
export async function restoreAll(deps: RestoreDeps): Promise<Restored> {
  if (await deps.restoreBundle(await deps.account(), deps.installBundle)) return 'bundle';
  const kits = await deps.restoreKit(await deps.provider(), deps.saveKit);
  const files = deps.restoreFiles ? await deps.restoreFiles() : false;
  return kits || files ? 'kits' : 'none';
}
export function restoreMessage(result: Restored | Error, preview: boolean): string {
  if (result === 'bundle') return 'Your Complete Bundle is back on this phone: both kits and your documents.';
  if (result === 'kits') return 'Your kits are back on this phone and ready offline.';
  if (preview) return 'This is a preview, so there are no purchases to restore here.';
  if (result === 'none') return 'No kit or bundle purchase was found for this store account.';
  return result.message === 'KIT_RESTORE_PARTIAL' ? 'One kit is back on this phone. Another could not be restored; try again. You do not need to buy it again.'
    : 'Your purchase could not be restored. Try again when you are online. You do not need to buy it again.';
}
