// The public page on how ApprovalPrep stays outside credit-repair law (her ask 13 Nov 2026).
export const CREDIT_REPAIR_DEFENSE_URL = 'https://approvalprep.com/credit-repair-disclaimer/';
export const CREDIT_REPAIR_DEFENSE_LABEL = 'Why we\u2019re not a credit repair company ›';
export const MORE_LINKS = [
  { label: 'The bureau answered: what it means', url: 'https://approvalprep.com/the-bureau-answered/' },
  { label: 'Privacy', url: 'https://approvalprep.com/privacy/' },
  { label: CREDIT_REPAIR_DEFENSE_LABEL, url: CREDIT_REPAIR_DEFENSE_URL },
  { label: 'Terms', url: 'https://approvalprep.com/terms/' },
  { label: 'Disclaimer', url: 'https://approvalprep.com/disclaimer/' },
  { label: 'Refund policy', url: 'https://approvalprep.com/refund-policy/' },
  { label: 'Contact', url: 'https://approvalprep.com/contact/' },
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
