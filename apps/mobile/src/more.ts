export const MORE_LINKS = [
  { label: 'Privacy', url: 'https://approvalprep.com/privacy/' },
  { label: 'Not a credit repair company', url: 'https://approvalprep.com/not-a-credit-repair-company/' },
  { label: 'Terms', url: 'https://approvalprep.com/terms/' },
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
