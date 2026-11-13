// The letters in v1 (docs/APP_PLAN.md, Features). Free = drafts and saves for $0, for ever.
// kit = unlocked by the one-time Credit Letter Kit purchase (price: her call, not set here).
export type ExplanationKind = 'explanation-credit' | 'explanation-income-gap' | 'explanation-employment-gap' | 'explanation-address-history' | 'explanation-rental-issue' | 'explanation-late-payment' | 'explanation-bank-statement' | 'explanation-life-event' | 'explanation-general-application';
export type LetterKind = ExplanationKind | 'bureau-dispute' | 'goodwill' | 'debt-validation' | 'settlement-terms' | 'follow-up';
export interface LetterType { kind: LetterKind; name: string; when: string; access: 'free' | 'kit' }
export const LETTERS: readonly LetterType[] = [
  { kind: 'bureau-dispute', name: 'Credit bureau dispute letter', when: 'Something on your report is wrong.', access: 'free' },
  { kind: 'goodwill', name: 'Goodwill letter', when: 'A late payment is accurate and you want to ask for kindness.', access: 'kit' },
  { kind: 'debt-validation', name: 'Debt validation letter', when: 'A collector contacted you and you want proof of the debt.', access: 'kit' },
  { kind: 'settlement-terms', name: 'Settlement terms in writing letter', when: 'You want the collector’s offer in writing before you pay. They may say no.', access: 'kit' },
  { kind: 'follow-up', name: 'Follow-up letter', when: 'You sent a dispute and want to follow up on the answer.', access: 'kit' },
];
/** Letters about a credit report or a debt carry the credit-report caution; the others do not. */
const CREDIT_KINDS: readonly string[] = ['bureau-dispute', 'goodwill', 'debt-validation', 'settlement-terms', 'follow-up', 'explanation-credit', 'explanation-late-payment', 'studio-credit-dispute', 'studio-credit'];
export const isCreditLetter = (kind: string) => CREDIT_KINDS.includes(kind);
export const isLetterKind = (k: string): k is LetterKind => [...LETTERS, ...EXPLANATION_LETTERS].some((l) => l.kind === k);

export const EXPLANATION_LETTERS: readonly LetterType[] = [
  { kind: 'explanation-credit', name: 'Credit explanation letter', when: 'You need to explain your credit history.', access: 'kit' },
  { kind: 'explanation-income-gap', name: 'Income gap explanation letter', when: 'You need to explain a gap in income.', access: 'kit' },
  { kind: 'explanation-employment-gap', name: 'Employment gap explanation letter', when: 'You need to explain time between jobs.', access: 'kit' },
  { kind: 'explanation-address-history', name: 'Address history explanation letter', when: 'You need to explain previous addresses.', access: 'kit' },
  { kind: 'explanation-rental-issue', name: 'Rental issue explanation letter', when: 'You need to explain a rental history question.', access: 'kit' },
  { kind: 'explanation-late-payment', name: 'Late payment explanation letter', when: 'You need to explain an accurate late payment.', access: 'kit' },
  { kind: 'explanation-bank-statement', name: 'Bank statement explanation letter', when: 'You need to explain an entry on a statement.', access: 'kit' },
  { kind: 'explanation-life-event', name: 'Life event explanation letter', when: 'You need to explain a change in circumstances.', access: 'kit' },
  { kind: 'explanation-general-application', name: 'General application explanation letter', when: 'You need to explain details in an application.', access: 'kit' },
];
