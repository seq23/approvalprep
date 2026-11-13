import { KIT, COMPLETE_BUNDLE, BUNDLE_UPGRADE } from '../kit';
export const EXPLANATION_PRODUCT = 'ap_explanation_kit';
export type BundleOwnership = { creditKit: boolean; explanationKit: boolean; bundle: boolean };
export type OfferId = typeof KIT.productId | typeof EXPLANATION_PRODUCT | typeof COMPLETE_BUNDLE.productId | typeof BUNDLE_UPGRADE.productId;
export const NO_OWNERSHIP: BundleOwnership = { creditKit: false, explanationKit: false, bundle: false };
/** Order is the owner's offer rule. A caller chooses which letter's kit is relevant. */
export function offersFor(owned: BundleOwnership, requested: 'credit' | 'explanation' = 'credit'): OfferId[] {
  if (owned.bundle) return [];
  if (owned.creditKit && owned.explanationKit) return [BUNDLE_UPGRADE.productId];
  if (owned.creditKit) return [EXPLANATION_PRODUCT, BUNDLE_UPGRADE.productId];
  if (owned.explanationKit) return [KIT.productId, BUNDLE_UPGRADE.productId];
  return [COMPLETE_BUNDLE.productId, requested === 'credit' ? KIT.productId : EXPLANATION_PRODUCT];
}
/** The kits she does not own yet, both named, for the bundle screen's "Other options". */
export function otherKits(owned: BundleOwnership): OfferId[] {
  if (owned.bundle) return [];
  return [...(owned.creditKit ? [] : [KIT.productId]), ...(owned.explanationKit ? [] : [EXPLANATION_PRODUCT as OfferId])];
}
export function ownershipFrom(active: Record<string, { productIdentifier: string; expirationDate?: string | null }>): BundleOwnership {
  const owns = (id: string) => active[id]?.productIdentifier === id && active[id]?.expirationDate == null;
  const bundle = owns(COMPLETE_BUNDLE.productId) || owns(BUNDLE_UPGRADE.productId);
  return { bundle, creditKit: bundle || owns(KIT.productId), explanationKit: bundle || owns(EXPLANATION_PRODUCT) };
}
