import { KIT, COMPLETE_BUNDLE, BUNDLE_UPGRADE, EXPLANATION_KIT, FILE_KITS, ALL_KIT_IDS } from '../kit';
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
const ownsAnyKit = (owned: BundleOwnership) => ALL_KIT_IDS.some(id => ownsKit(owned, id));
const asProduct = (requested: string) => requested === 'credit' ? KIT.productId : requested === 'explanation' ? EXPLANATION_PRODUCT : requested;
/**
 * The owner's offer rule (docs/APP_PLAN.md, "Bundle upgrade"): nobody pays twice.
 * Owns nothing → the bundle first, then the kit she asked about. Owns any kit → the kit she asked
 * about if she does not have it, then the one upgrade. Owns the bundle → nothing.
 * A kit she owns is never offered again, and a kit owner is never offered the full-price bundle.
 */
export function offersFor(owned: BundleOwnership, requested: string = 'credit'): OfferId[] {
  const kit = asProduct(requested);
  const asked = ALL_KIT_IDS.includes(kit) ? [kit] : [];
  if (owned.bundle) return [];
  if (ownsAnyKit(owned)) return [...asked.filter(id => !ownsKit(owned, id)), BUNDLE_UPGRADE.productId];
  return [COMPLETE_BUNDLE.productId, ...asked];
}
/** The kits she does not own yet, for the bundle screen's "Other options", in the given order. */
export function otherKits(owned: BundleOwnership, order: readonly string[] = [KIT.productId, EXPLANATION_PRODUCT, ...FILE_KITS.map(k => k.productId)]): OfferId[] {
  if (owned.bundle) return [];
  return order.filter(id => !ownsKit(owned, id));
}
export function ownershipFrom(active: Record<string, { productIdentifier: string; expirationDate?: string | null }>): BundleOwnership {
  const owns = (id: string) => active[id]?.productIdentifier === id && active[id]?.expirationDate == null;
  const bundle = owns(COMPLETE_BUNDLE.productId) || owns(BUNDLE_UPGRADE.productId);
  return { bundle, creditKit: bundle || owns(KIT.productId), explanationKit: bundle || owns(EXPLANATION_PRODUCT),
    fileKits: FILE_KITS.map(k => k.productId).filter(id => bundle || owns(id)) };
}
