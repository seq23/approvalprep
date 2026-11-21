// The mortgage moment (audience research, 21 Nov 2026, gaps #2 and #3): borrowers get an
// underwriting condition and do not know which letter answers it, and some mail credit disputes
// mid-loan without asking their loan officer. Educational and sourced; no outcome is promised.
import { EXPLANATION_LETTERS, type ExplanationKind } from './letters';

export const MORTGAGE_SOURCE = {
  label: 'Fannie Mae Selling Guide, B3-5.3-09',
  url: 'https://selling-guide.fanniemae.com/sel/b3-5.3-09/du-credit-report-analysis',
  read: '2026-11-21',
} as const;

/** Shown where a dispute letter starts. Fannie Mae's guide (MORTGAGE_SOURCE) has lenders look into disputed accounts. */
export const MORTGAGE_DISPUTE_LINE = 'Buying a home or refinancing? Ask your loan officer before you mail a dispute. A dispute can mark the account as disputed, and Fannie Mae’s underwriting rules can then require your lender to look into it, which can add steps to your loan.';

export const UNDERWRITER_TITLE = 'What the underwriter is asking';
export const UNDERWRITER_INTRO = 'A condition asks about one thing in your file. Answer only that thing: what happened, the dates, and what is true now. Send the proof the condition names, and keep it to one page.';

/** Each common condition, in the underwriter's own question, and the explanation letter that answers it. */
const CONDITIONS: readonly { asks: string; kind: ExplanationKind }[] = [
  { asks: 'Where did this large deposit come from?', kind: 'explanation-bank-statement' },
  { asks: 'Why were there recent credit inquiries, and did you open new credit?', kind: 'explanation-credit' },
  { asks: 'Why was this payment late?', kind: 'explanation-late-payment' },
  { asks: 'Why is there a gap in your work history?', kind: 'explanation-employment-gap' },
  { asks: 'Why did your income drop or stop?', kind: 'explanation-income-gap' },
  { asks: 'Why do your addresses differ?', kind: 'explanation-address-history' },
];

export interface UnderwriterCondition { asks: string; kind: ExplanationKind; letter: string }
export const UNDERWRITER_CONDITIONS: readonly UnderwriterCondition[] = CONDITIONS.map(c => {
  const letter = EXPLANATION_LETTERS.find(l => l.kind === c.kind);
  if (!letter) throw Error(`NAMED STOP [UNDERWRITER_LETTER_MISSING] ${c.kind} is not an explanation letter`);
  return { ...c, letter: letter.name };
});

/** The Studio situation a mortgage borrower picks ("Loan, auto or mortgage"). */
export const showsUnderwriterGuide = (situation: string | undefined, step: number) => situation === 'loan' && step === 0;
/** Dispute letters, on their first question: the moment before she writes to a bureau. */
export const showsMortgageCaution = (kind: string, step: number) => (kind === 'bureau-dispute' || kind === 'follow-up') && step === 0;
