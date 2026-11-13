import type { Entitlement, PurchasesProvider } from './provider';
import type { BundleAccount, BundleReceipt } from './bundleDelivery';
import type { KitTemplates } from '../kitTemplates';
// "Restore a purchase" on More does what its line says: it asks the store account for the bundle
// and for each kit, and puts back whatever it finds. Nothing to choose first.
export interface RestoreDeps {
  provider(): Promise<PurchasesProvider>;
  account(): Promise<BundleAccount>;
  restoreKit(provider: PurchasesProvider, save: (kit: KitTemplates) => Promise<boolean>, bought?: Entitlement): Promise<boolean>;
  restoreBundle(account: BundleAccount, install: (receipt: BundleReceipt) => Promise<void>): Promise<boolean>;
  saveKit(kit: KitTemplates): Promise<boolean>;
  installBundle(receipt: BundleReceipt): Promise<void>;
}
export type Restored = 'bundle' | 'kits' | 'none';
export async function restoreAll(deps: RestoreDeps): Promise<Restored> {
  if (await deps.restoreBundle(await deps.account(), deps.installBundle)) return 'bundle';
  return await deps.restoreKit(await deps.provider(), deps.saveKit) ? 'kits' : 'none';
}
export function restoreMessage(result: Restored | Error, preview: boolean): string {
  if (result === 'bundle') return 'Your Complete Bundle is back on this phone: both kits and your documents.';
  if (result === 'kits') return 'Your kit is back on this phone and ready offline.';
  if (preview) return 'This is a preview, so there are no purchases to restore here.';
  if (result === 'none') return 'No kit or bundle purchase was found for this store account.';
  return result.message === 'KIT_RESTORE_PARTIAL' ? 'One kit is back on this phone. Another could not be restored; try again. You do not need to buy it again.'
    : 'Your purchase could not be restored. Try again when you are online. You do not need to buy it again.';
}
