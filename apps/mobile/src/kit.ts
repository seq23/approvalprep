// The Credit Letter Kit in-app purchase. Her rulings, approved 6 Nov 2026: $19.99 paid once
// (non-consumable, no subscription), sold under the COMPANY store accounts (Redwood Reserve
// Holdings LLC, after the D-U-N-S number). Switched OFF until those accounts and RevenueCat exist;
// she signs up for them herself. Codex task 8 (docs/APP_PLAN.md) turns this on only then.
export const KIT = { productId: 'ap_credit_kit', approvedPriceUSD: 19.99, approved: '2026-11-06' } as const;
export const KIT_SALES_ENABLED = false;
export const KIT_STOP = 'STORE_ACCOUNTS_NOT_READY';

// Buying while switched off is a named stop, never a charge or a silent no-op.
export function kitPurchaseGate(enabled: boolean = KIT_SALES_ENABLED): { ok: true } | { ok: false; stop: typeof KIT_STOP; reason: string } {
  if (enabled) return { ok: true };
  return { ok: false, stop: KIT_STOP, reason: 'The company store accounts and RevenueCat are not set up yet, so the letter kits cannot be bought.' };
}

export const EXPLANATION_KIT = { productId: 'ap_explanation_kit', approvedPriceUSD: 14.99, approved: '2026-11-10' } as const;
