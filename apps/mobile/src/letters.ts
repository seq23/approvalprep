// The letters in v1 (docs/APP_PLAN.md, Features). Free = drafts and saves for $0, for ever.
// kit = unlocked by the one-time Credit Letter Kit purchase (price: her call, not set here).
export type LetterKind = 'bureau-dispute' | 'goodwill' | 'debt-validation' | 'settlement-terms' | 'follow-up';
export interface LetterType { kind: LetterKind; name: string; when: string; access: 'free' | 'kit' }
export const LETTERS: readonly LetterType[] = [
  { kind: 'bureau-dispute', name: 'Credit bureau dispute letter', when: 'Something on your report is wrong.', access: 'free' },
  { kind: 'goodwill', name: 'Goodwill letter', when: 'A late payment is accurate and you want to ask for kindness.', access: 'kit' },
  { kind: 'debt-validation', name: 'Debt validation letter', when: 'A collector contacted you and you want proof of the debt.', access: 'kit' },
  { kind: 'settlement-terms', name: 'Settlement terms in writing letter', when: 'You want settlement terms in writing before paying. They may say no.', access: 'kit' },
  { kind: 'follow-up', name: 'Follow-up letter', when: 'You sent a dispute and want to follow up on the answer.', access: 'kit' },
];
export const isLetterKind = (k: string): k is LetterKind => LETTERS.some((l) => l.kind === k);
