import { KIT, COMPLETE_BUNDLE, EXPLANATION_KIT, FILE_KITS, ALL_KIT_IDS, UPGRADE_IDS, bundleUnlocked, kitPrice, upgradeFor } from '../kit';
export const EXPLANATION_PRODUCT = EXPLANATION_KIT.productId;
export type OfferId = string;
/** `fileKits` holds the product ids of the five file-only kits she owns. */
export type BundleOwnership = { creditKit: boolean; explanationKit: boolean; bundle: boolean; fileKits?: string[] };
export const NO_OWNERSHIP: BundleOwnership = { creditKit: false, explanationKit: false, bundle: false, fileKits: [] };
export function ownsKit(owned: BundleOwnership, productId: string): boolean {
  if (owned.bundle) return true;
  if (productId === KIT.productId) return owned.creditKit;
  if (productId === EXPLANATION_PRODUCT) return owned.explanationKit;
  return (owned.fileKits ?? []).includes(productId);
}
/** The single kits she owns, bought one by one (empty for a bundle owner). */
export const ownedKitIds = (owned: BundleOwnership): string[] => owned.bundle ? [] : ALL_KIT_IDS.filter(id => ownsKit(owned, id));
const asProduct = (requested: string) => requested === 'credit' ? KIT.productId : requested === 'explanation' ? EXPLANATION_PRODUCT : requested;
const cents = (n: number) => Math.round(n * 100);
/**
 * The owner's offer rule (docs/APP_PLAN.md, "Bundle upgrade"): nobody ever pays more in total than
 * the Complete Bundle. Owns nothing → the bundle first, then the kit she asked about. Owns a kit →
 * the kit she asked about only if it still keeps her total within the bundle price, then her one
 * upgrade tier (src/lib/appUpgrade.mjs). Owns the bundle, or her kits already cover it → nothing.
 */
export function offersFor(owned: BundleOwnership, requested: string = 'credit'): OfferId[] {
  const kit = asProduct(requested);
  const asked = ALL_KIT_IDS.includes(kit) ? [kit] : [];
  if (owned.bundle) return [];
  const upgrade = upgradeFor(ownedKitIds(owned));
  if (!upgrade) return [COMPLETE_BUNDLE.productId, ...asked];
  if (upgrade.free || !upgrade.tier) return [];
  const room = cents(COMPLETE_BUNDLE.approvedPriceUSD) - cents(upgrade.paid);
  return [...asked.filter(id => !ownsKit(owned, id) && cents(kitPrice(id)) <= room), upgrade.tier.id];
}
/** The kits she does not own yet, for the bundle screen's "Other options", in the given order. */
export function otherKits(owned: BundleOwnership, order: readonly string[] = [KIT.productId, EXPLANATION_PRODUCT, ...FILE_KITS.map(k => k.productId)]): OfferId[] {
  if (owned.bundle) return [];
  return order.filter(id => !ownsKit(owned, id));
}
export function ownershipFrom(active: Record<string, { productIdentifier: string; expirationDate?: string | null }>): BundleOwnership {
  const owns = (id: string) => active[id]?.productIdentifier === id && active[id]?.expirationDate == null;
  const kits = ALL_KIT_IDS.filter(owns);
  const bundle = bundleUnlocked({ kits, upgrades: UPGRADE_IDS.filter(owns), bundle: owns(COMPLETE_BUNDLE.productId) });
  return { bundle, creditKit: bundle || owns(KIT.productId), explanationKit: bundle || owns(EXPLANATION_PRODUCT),
    fileKits: FILE_KITS.map(k => k.productId).filter(id => bundle || owns(id)) };
}
