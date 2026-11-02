// The <title> every page ships. Bing Webmaster Site Scan (25 Sep 2026) flagged
// "Title too long" on 20 approvalprep.com pages: blog answers carried
// "<question> - ApprovalPrep Blog" and the reports carried
// "<report title> - ApprovalPrep", both past 70 characters, so Bing truncates or
// ignores them. The page's own title (H1, og:title, breadcrumbs) is unchanged;
// only the <title> element is fitted here, in the one layout every page uses.
//
// The band is 30-65 characters. Bing truncates past 70; Google's result line
// and the Search Readiness checklist (item b1, 25 Oct 2026) stop at 65.
//
// Reserve space for the brand before fitting the subject; never drop the brand
// (Search Readiness b10). Prefer a short form of a generated question, then the
// whole phrase before ": ", then a cut at the last whole word with an ellipsis.
// A long title never fails the build (owner ruling 2 Nov 2026: over a length
// limit never fails; the generator trims). Guarded by
// scripts/validate/title-fit.mjs, which runs this function.

export const TITLE_MAX = 65;
export const TITLE_HEAD_MIN = 30;
const SUFFIX = /\s+-\s+ApprovalPrep(?:\s+Blog)?\s*$/;
const SHORT_SUFFIX = " - ApprovalPrep";
const ELLIPSIS = "…";
const QUESTION_SHORT_FORMS = [
  [/^What should I know about (.+?)\??$/, "About "],
  [/^What should I gather before using (.+?)\??$/, "What to gather for "],
  [/^What mistakes should I avoid with (.+?)\??$/, "Mistakes to avoid with "],
  [/^How should I prepare for (.+?)\??$/, "How to prepare for "],
];

function trimToWord(subject, max) {
  const room = max - ELLIPSIS.length;
  const cut = subject.slice(0, room + 1);
  const space = cut.lastIndexOf(" ");
  const head = (space > room / 2 ? cut.slice(0, space) : subject.slice(0, room)).replace(/[\s,;:.\-–—]+$/, "");
  return head + ELLIPSIS;
}

/** @param {string} title @returns {string} */
export function fitTitle(title) {
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
  return trimToWord(subject, subjectMax) + SHORT_SUFFIX;
}
