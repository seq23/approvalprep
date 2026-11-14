// Words that must never drift. R-ADV-13 (risk brain): every credit surface ends with SELF_HELP_LINE,
// word for word, and nothing promises an outcome. Guard: tests/self-help.test.ts.
export const SELF_HELP_LINE = 'Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.';
export const IDEA_LINE = 'Dispute it yourself. Skip the monthly fee.';
export const HONEST_LIMIT = 'Accurate information usually stays on a report. A letter is a request, not a promise.';
// For a letter to a landlord, lender or employer: the credit-report caution does not belong there.
export const REQUEST_LINE = 'A letter is a request, not a promise. Whoever reads it decides.';
export const WHAT_IT_IS = 'Letters you write and mail yourself.';
export const PRIVACY_LINE = 'No account, no upload. Your answers stay on this phone.';
// Home's "Thinking of paying a credit repair company?" (finding #14). Each line is the FTC's own point
// (DIY_SOURCE, read 14 Nov 2026); "credit repair" appears only as the thing she would be paying for.
export const DIY_SOURCE = { label: 'FTC, Fixing Your Credit FAQs', url: 'https://consumer.ftc.gov/articles/fixing-your-credit-faqs' } as const;
export const DIY_FACTS = [
  'You can dispute a mistake on your credit report yourself, for free, by writing to the credit bureau.',
  'By federal law, a credit repair company cannot charge you until it has done the work it promised.',
  'No one can legally take accurate, current information off your credit report.',
] as const;
