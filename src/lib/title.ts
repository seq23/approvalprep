// The <title> every page ships. Bing Webmaster Site Scan (25 Sep 2026) flagged
// "Title too long" on 20 approvalprep.com pages: blog answers carried
// "<question> - ApprovalPrep Blog" and the reports carried
// "<report title> - ApprovalPrep", both past 70 characters, so Bing truncates or
// ignores them. The page's own title (H1, og:title, breadcrumbs) is unchanged;
// only the <title> element is fitted here, in the one layout every page uses.
//
// The band is 30-65 characters. Bing truncates past 70; Google's result line
// and the Search Readiness checklist (item b1, 25 Oct 2026) stop at 65, and
// three approvalprep.com titles - the homepage and two blog answers - were
// 67-70. 65 is the tighter of the two limits, so it is the one enforced.
//
// Reserve space for the brand before fitting the subject. Dropping the suffix
// to meet the length band made the goodwill guide fail Search Readiness b10.
// Shorten a generated question or use its whole phrase before ": "; never drop
// the brand. A subject without a short form must be fixed at its source.
// scripts/validate/title-length.mjs asserts the result on every built page.

export const TITLE_MAX = 65;
export const TITLE_HEAD_MIN = 30;
const SUFFIX = /\s+-\s+ApprovalPrep(?:\s+Blog)?\s*$/;
const SHORT_SUFFIX = " - ApprovalPrep";
const QUESTION_SHORT_FORMS: Array<[RegExp, string]> = [
  [/^What should I know about (.+?)\??$/, "About "],
  [/^What should I gather before using (.+?)\??$/, "What to gather for "],
  [/^What mistakes should I avoid with (.+?)\??$/, "Mistakes to avoid with "],
  [/^How should I prepare for (.+?)\??$/, "How to prepare for "],
];

export function fitTitle(title: string): string {
  const full = String(title).trim();
  if (/approvalprep/i.test(full) && full.length <= TITLE_MAX) return full;
  const subject = full.replace(SUFFIX, "").trim();
  const subjectMax = TITLE_MAX - SHORT_SUFFIX.length;
  if (subject.length <= subjectMax) return subject + SHORT_SUFFIX;
  // The blog answer generator (scripts/content/generate-candidate.mjs) phrases
  // every title as one of four questions. Published titles keep their slugs and
  // headings; only the <title> takes the short form of the same question.
  for (const [pattern, short] of QUESTION_SHORT_FORMS) {
    const match = subject.match(pattern);
    if (match) {
      const shortened = `${short}${match[1]}`.trim();
      if (shortened.length + SHORT_SUFFIX.length >= TITLE_HEAD_MIN && shortened.length <= subjectMax) return shortened + SHORT_SUFFIX;
    }
  }
  const colon = subject.indexOf(": ");
  if (colon + SHORT_SUFFIX.length >= TITLE_HEAD_MIN && colon <= subjectMax) return subject.slice(0, colon).trim() + SHORT_SUFFIX;
  throw new Error(
    `fitTitle: "${full}" is ${full.length} characters and has no whole-phrase form within ${TITLE_MAX}. ` +
      "Give the page a shorter title at its source."
  );
}
