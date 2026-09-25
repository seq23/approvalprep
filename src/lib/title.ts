// The <title> every page ships. Bing Webmaster Site Scan (25 Sep 2026) flagged
// "Title too long" on 20 approvalprep.com pages: blog answers carried
// "<question> - ApprovalPrep Blog" and the reports carried
// "<report title> - ApprovalPrep", both past 70 characters, so Bing truncates or
// ignores them. The page's own title (H1, og:title, breadcrumbs) is unchanged;
// only the <title> element is fitted here, in the one layout every page uses.
//
// Order: keep the full title when it fits; otherwise drop the site suffix; then,
// if the subject alone is still too long, keep its head before ": " when that
// head is a whole phrase of at least 30 characters. A title that cannot be fitted
// this way fails the build rather than shipping an over-long title.
// scripts/validate/title-length.mjs asserts the result on every built page.

export const TITLE_MAX = 70;
export const TITLE_HEAD_MIN = 30;
const SUFFIX = /\s+-\s+ApprovalPrep(?:\s+Blog)?\s*$/;
const SHORT_SUFFIX = " - ApprovalPrep";
const QUESTION_SHORT_FORMS: Array<[RegExp, string]> = [
  [/^What should I know about (.+?)\??$/, "What to know about "],
  [/^What should I gather before using (.+?)\??$/, "What to gather for "],
  [/^What mistakes should I avoid with (.+?)\??$/, "Mistakes to avoid with "],
  [/^How should I prepare for (.+?)\??$/, "How to prepare for "],
];

export function fitTitle(title: string): string {
  const full = String(title).trim();
  if (full.length <= TITLE_MAX) return full;
  const subject = full.replace(SUFFIX, "").trim();
  if (subject !== full && subject.length + SHORT_SUFFIX.length <= TITLE_MAX) return subject + SHORT_SUFFIX;
  if (subject.length <= TITLE_MAX) return subject;
  // The blog answer generator (scripts/content/generate-candidate.mjs) phrases
  // every title as one of four questions. Published titles keep their slugs and
  // headings; only the <title> takes the short form of the same question.
  for (const [pattern, short] of QUESTION_SHORT_FORMS) {
    const match = subject.match(pattern);
    if (match) {
      const shortened = `${short}${match[1]}`.trim();
      if (shortened.length >= TITLE_HEAD_MIN && shortened.length <= TITLE_MAX) return shortened;
    }
  }
  const colon = subject.indexOf(": ");
  if (colon >= TITLE_HEAD_MIN && colon <= TITLE_MAX) return subject.slice(0, colon).trim();
  throw new Error(
    `fitTitle: "${full}" is ${full.length} characters and has no whole-phrase form within ${TITLE_MAX}. ` +
      "Give the page a shorter title at its source."
  );
}
