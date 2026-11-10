// The Letter Studio's situations, questions and letter builder live in one plain module so the
// website, the phone app and the validator run the same code. Import from here; never copy.
export { studioSituations, studioBenefits, bureaus, buildLetter, letterText, situationById, tidySentences, SELF_HELP_LINE, TRUE_FACTS_LINE, BUREAU_ADDRESSES_CHECKED, ANSWER_WINDOW, BEFORE_YOU_MAIL, answerDueDate, parseDay, dayValue, buildAnswerDueIcs, formatLetterDate } from "../lib/letterStudioCore.mjs";
export { kitMoments } from "../lib/kitMoments.mjs";
