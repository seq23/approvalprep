// Every website page the app opens goes through /api/app-page/ (functions/api/app-page/[[path]].js): the
// page without its shop menu, footer or links onward, so nothing opened from the app points to buying on
// the website (App Review 3.1.1). Checked live by scripts/ops/post-deploy-live-check.mjs.
export const appPage = (path: string) => `https://approvalprep.com/api/app-page${path}`;
// The public page on how ApprovalPrep stays outside credit-repair law (her ask 13 Nov 2026).
export const CREDIT_REPAIR_DEFENSE_URL = appPage('/credit-repair-disclaimer/');
// No › here: a list row draws its own (finding #20, "› ›"); a link button adds one.
export const CREDIT_REPAIR_DEFENSE_LABEL = 'Why we\u2019re not a credit repair company';
export const TERMS_URL = appPage('/terms/');
export const PRIVACY_URL = appPage('/privacy/');
export const MORE_LINKS = [
  { label: 'Privacy', url: PRIVACY_URL },
  { label: CREDIT_REPAIR_DEFENSE_LABEL, url: CREDIT_REPAIR_DEFENSE_URL },
  { label: 'Terms', url: TERMS_URL },
  { label: 'Disclaimer', url: appPage('/disclaimer/') },
  { label: 'Refund policy', url: appPage('/refund-policy/') },
  { label: 'Contact', url: appPage('/contact/') },
] as const;
export function deletionController(removeAll: () => Promise<void>) {
  let phase: 'idle' | 'confirm' | 'deleting' = 'idle';
  return {
    request() { if (phase === 'idle') phase = 'confirm'; return phase; },
    keep() { if (phase === 'confirm') phase = 'idle'; return phase; },
    async confirm() {
      if (phase !== 'confirm') return false;
      phase = 'deleting';
      try { await removeAll(); phase = 'idle'; return true; }
      catch (error) { phase = 'confirm'; throw error; }
    },
  };
}
