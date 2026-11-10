// The free Letter Studio: situations, questions and the letter builder.
//
// One pure module, no browser or server APIs, so the website, the phone app and the validator all
// run the same code (the app plan: "import it, never copy"). Everything here is deterministic text:
// no model call, no network, $0.
//
// The free line (owner, 10 Nov 2026): the Studio gives ONE first-pass letter per situation in proper
// letter form. Follow-up letters, situation variants, filled examples, tracking and reminders are the
// paid kits'. The credit bureau dispute letter is free with its PDF (the FTC gives that letter away).
//
// Risk R-ADV-13: nothing here promises an outcome, gives legal advice or acts for the reader.

export const SELF_HELP_LINE = "Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.";
export const TRUE_FACTS_LINE = "Use only what is true and what you can show.";

// Mail addresses for disputes. Every address carries the page it was read from and the day it was
// read; the validator fails an address with no dated source. Re-read the source before changing a
// date (a date moves only when the address was actually checked again).
export const bureaus = [
  { id: "equifax", name: "Equifax", lines: ["Equifax Information Services LLC", "P.O. Box 740256", "Atlanta, GA 30374"],
    source: { label: "Equifax mail dispute form", url: "https://assets.equifax.com/assets/personal/Dispute.pdf", read: "2026-11-10" } },
  { id: "experian", name: "Experian", lines: ["Experian", "P.O. Box 4500", "Allen, TX 75013"],
    source: { label: "Experian, how to dispute credit report information", url: "https://www.experian.com/blogs/ask-experian/credit-education/faqs/how-to-dispute-credit-report-information/", read: "2026-11-10" } },
  { id: "transunion", name: "TransUnion", lines: ["TransUnion LLC", "Consumer Dispute Center", "P.O. Box 2000", "Chester, PA 19016"],
    source: { label: "FTC, Disputing Errors on Your Credit Reports", url: "https://consumer.ftc.gov/articles/disputing-errors-your-credit-reports", read: "2026-11-10" } }
];
export const BUREAU_ADDRESSES_CHECKED = "10 Nov 2026";

// The bureau's answer window. 30 days: the FTC's article. The extra 15 days: the statute itself.
export const ANSWER_WINDOW = {
  days: 30,
  text: "A credit bureau has 30 days from the day it gets your dispute to investigate, and must send you the results in writing. The law allows up to 15 more days if you send it more information during that time.",
  source: { label: "FTC, Disputing Errors on Your Credit Reports", url: "https://consumer.ftc.gov/articles/disputing-errors-your-credit-reports", read: "2026-11-10" },
  law: { label: "15 U.S.C. 1681i(a)(1)", url: "https://www.law.cornell.edu/uscode/text/15/1681i", read: "2026-11-10" }
};

/** "2026-11-10" (a date input's value) as a local calendar day; anything else is today. */
export function parseDay(value, fallback = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  return Number.isNaN(d.getTime()) ? new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()) : d;
}
export const dayValue = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** The day the answer is due: the mailing day plus the 30-day window. A date we print, nothing we track. */
export function answerDueDate(mailedOn) { const d = new Date(mailedOn.getFullYear(), mailedOn.getMonth(), mailedOn.getDate()); d.setDate(d.getDate() + ANSWER_WINDOW.days); return d; }

/** A calendar file for her own calendar, made in the browser. It holds the date and a link, no account details. */
export function buildAnswerDueIcs({ mailedOn, bureauName = "", now = new Date() }) {
  const due = answerDueDate(mailedOn), next = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1);
  const ymd = (d) => dayValue(d).replace(/-/g, "");
  const esc = (t) => String(t).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  const who = bureauName ? ` (${bureauName})` : "";
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ApprovalPrep//Letter Studio//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:answer-due-${ymd(mailedOn)}-${ymd(due)}-${bureauName.toLowerCase().replace(/[^a-z]/g, "") || "bureau"}@approvalprep.com`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART;VALUE=DATE:${ymd(due)}`, `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${esc(`Credit bureau answer due about today${who}`)}`,
    `DESCRIPTION:${esc(`You mailed your dispute on ${formatLetterDate(mailedOn)}. ${ANSWER_WINDOW.text} What each answer means and what you can do yourself: https://approvalprep.com/the-bureau-answered/`)}`,
    "URL:https://approvalprep.com/the-bureau-answered/", "TRANSP:TRANSPARENT", "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n") + "\r\n";
}

// Page 2 of the free dispute PDF. Facts from the FTC article above.
export const BEFORE_YOU_MAIL = [
  "Sign the letter above your printed name.",
  "Put in a copy of your credit report with the item circled.",
  "Put in copies of your proof. Keep the originals.",
  "Send it by certified mail and ask for a return receipt, so you know the day it arrived.",
  "Keep a copy of the letter and of everything you enclosed.",
  "Check the mail address against the bureau's own website or your report before you mail.",
  "Send a letter only to a bureau whose report shows the error."
];

const F = {
  name: { name: "name", label: "Your full name", hint: "As it appears on your application or report", autocomplete: "name" },
  address: { name: "address", label: "Your mailing address", hint: "Street, then city, state and ZIP", kind: "lines", autocomplete: "street-address" },
  recipient: { name: "recipient", label: "Who is the letter for?", hint: "A name or a company. Leave empty for \"To whom it may concern\"" },
  reference: { name: "reference", label: "Application, loan or account number", hint: "Leave empty if you do not have one", optional: true },
  dates: { name: "dates", label: "When did it happen?", hint: "Example: March to May 2025", optional: true },
  happened: { name: "happened", label: "What happened?", hint: "Two or three plain sentences, in your own words", kind: "long" },
  now: { name: "now", label: "What is different now?", hint: "What changed, or what you are doing about it", kind: "long", optional: true },
  enclosures: { name: "enclosures", label: "What are you sending with it?", hint: "Example: bank statement, pay stubs", optional: true }
};
const explanationFields = [F.name, F.recipient, F.reference, F.dates, F.happened, F.now, F.enclosures];
const disputeFields = [
  F.name,
  F.address,
  { name: "bureau", label: "Which credit bureau shows the error?", kind: "bureau" },
  { name: "account", label: "Which account is wrong?", hint: "Company name and the last 4 digits. Example: Capital One, ending 4471" },
  { name: "shows", label: "What does the report say?", hint: "Example: 60 days late in March 2026" },
  { name: "happened", label: "Why is that wrong?", hint: "The true facts, in your own words", kind: "long" },
  { name: "enclosures", label: "What proof are you sending?", hint: "Copies, never originals. Example: bank statement", optional: true }
];

// Each situation is one letter frame: its own subject line, opening and closing sentences.
export const studioSituations = [
  {
    id: "credit-dispute", kind: "dispute", label: "An error on my credit report",
    recommendationSku: "credit-letter-kit", recommendationName: "Credit Letter Kit",
    subject: "Dispute of an item on my credit report", fields: disputeFields
  },
  {
    id: "credit", kind: "explanation", label: "A late payment or credit history to explain",
    recommendationSku: "credit-letter-kit", recommendationName: "Credit Letter Kit",
    subject: "Explanation of an item in my credit history",
    opening: "I am writing to explain an item in my credit history that you will see when you review my file.",
    closing: "I am glad to answer any question about this item."
  },
  {
    id: "general", kind: "explanation", label: "General explanation",
    recommendationSku: "letter-of-explanation", recommendationName: "Letter of Explanation Kit",
    subject: "Letter of explanation",
    opening: "I am writing to explain one part of my file, so that you have the facts in one place.",
    closing: "Please contact me if you need anything further."
  },
  {
    id: "income", kind: "explanation", label: "Income or employment",
    recommendationSku: "income-employment-letter-kit", recommendationName: "Income + Employment Letter Kit",
    subject: "Explanation of my income and employment",
    opening: "I am writing to explain my income and employment, so that the figures in my file are easy to follow.",
    closing: "I can provide further records of my income if they would help."
  },
  {
    id: "rental", kind: "explanation", label: "Rental application",
    recommendationSku: "rental-application-kit", recommendationName: "Rental Application Kit",
    subject: "Explanation to go with my rental application",
    opening: "I am writing to give you the facts behind one part of my rental application.",
    closing: "I am glad to provide references or further documents on request."
  },
  {
    id: "loan", kind: "explanation", label: "Loan, auto or mortgage",
    recommendationSku: "loan-prep-letter-kit", recommendationName: "Loan Prep Letter Kit",
    subject: "Letter of explanation for my loan file",
    opening: "I am writing to explain one part of my loan application, as requested for my file.",
    closing: "Please let me know if the underwriter needs anything further from me."
  },
  {
    id: "business", kind: "explanation", label: "Business funding",
    recommendationSku: "business-funding-prep-kit", recommendationName: "Business Funding Prep Kit",
    subject: "Explanation to go with my business funding application",
    opening: "I am writing to explain one part of my business funding application.",
    closing: "I can provide further business records on request."
  },
  {
    id: "life-admin", kind: "explanation", label: "Address, identity or records",
    recommendationSku: "life-admin-letter-kit", recommendationName: "Life Admin Letter Kit",
    subject: "Clarification of my records",
    opening: "I am writing to clarify a difference in my records, so that they can be matched correctly.",
    closing: "Please tell me if you need a further document to confirm this."
  },
  {
    id: "not-sure", kind: "explanation", label: "I am not sure",
    recommendationSku: "letter-of-explanation", recommendationName: "Letter of Explanation Kit",
    subject: "Letter of explanation",
    opening: "I am writing to explain one part of my file, so that you have the facts in one place.",
    closing: "Please contact me if you need anything further."
  }
].map((s) => ({ fields: explanationFields, ...s }));

export const studioBenefits = [
  "No account. Nothing stored on our side. Nothing to renew.",
  "Nothing you type is sent to us. Your draft is kept in this browser tab only.",
  "A first-pass letter in proper letter form, to copy, share or print.",
  "The credit report dispute letter comes addressed to the bureau you pick and saves as a PDF.",
  "Each letter shows what the paid kit adds after it."
];

export const situationById = (id) => studioSituations.find((s) => s.id === id) || studioSituations.find((s) => s.id === "general");

const MONTHS = /\b(?:january|february|march|april|june|july|august|september|october|november|december)\b|\b(?:jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b(?=\.?\s*\d)/gi;
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const collapse = (v) => String(v ?? "").replace(/\s+/g, " ").trim().replace(MONTHS, (m) => cap(m.toLowerCase()));

/** Her own words, tidied into sentences: capitals, a lone "i", one full stop at the end. */
export function tidySentences(value) {
  let t = collapse(value);
  if (!t) return "";
  t = t.replace(/\bi\b(?=$|[\s'’,.!?;:])/g, "I");
  t = t.replace(/([.!?])\1+/g, "$1").replace(/\s+([.,!?;:])/g, "$1");
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase());
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}
/** A short fact (a name, an account, a date): trimmed, no trailing full stop. */
export const tidyFact = (value) => collapse(value).replace(/[.;,]+$/, "");
/** A name typed all in lower case gets its capitals; anything else is left as she wrote it. */
const tidyName = (value) => { const v = tidyFact(value); return v && v === v.toLowerCase() ? v.replace(/(^|[\s'-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase()) : v; };
const lines = (value) => String(value ?? "").split(/\n|;/).map(collapse).filter(Boolean);
const listItems = (value) => String(value ?? "").split(/\n|;|,(?!\s*\d{4}\b)| and (?=[a-z])/i).map((x) => tidyFact(x)).filter(Boolean);

export function formatLetterDate(date = new Date()) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Build one letter. Returns the letter as parts (for the PDF), as plain text (to copy), and the
 * list of blanks she still has to fill: a [bracket] appears only where a needed fact is missing.
 */
export function buildLetter(situationId, answers = {}, { today = new Date() } = {}) {
  const s = situationById(situationId);
  const blanks = [];
  const need = (name, bracket) => {
    const v = name === "name" ? tidyName(answers[name]) : tidyFact(answers[name]);
    if (v) return v;
    blanks.push(bracket);
    return `[${bracket}]`;
  };
  const name = need("name", "Your full name");
  const date = formatLetterDate(today);
  const enclosed = listItems(answers.enclosures);
  let sender = [name], recipient, salutation, paragraphs, enclosures, reference = [];

  if (s.kind === "dispute") {
    const addr = lines(answers.address);
    if (addr.length) sender.push(...addr); else { blanks.push("Your mailing address"); sender.push("[Your street address]", "[City, state and ZIP]"); }
    const bureau = bureaus.find((b) => b.id === answers.bureau);
    if (bureau) recipient = [...bureau.lines]; else { blanks.push("The credit bureau"); recipient = ["[Credit bureau name]", "[Its mail address for disputes]"]; }
    salutation = "To whom it may concern:";
    reference = [`Account: ${cap(need("account", "Company name and last 4 digits of the account"))}`.replace("Account: [C", "Account: [C")];
    const shows = need("shows", "What the report says");
    const why = tidySentences(answers.happened);
    if (!why) blanks.push("Why it is wrong");
    paragraphs = [
      "I am writing to dispute one item in my credit file. I have circled it on the enclosed copy of my report.",
      `The report shows this for the account above: ${shows}. This is not accurate.`,
      why || "[Say what is true and why the report is wrong]",
      "I ask that you investigate this item and correct it, or remove it, so that my report is accurate. Please send me the written results of your investigation.",
      enclosed.length ? "Copies of the documents that support this dispute are enclosed and listed below." : "A copy of my credit report with the item circled is enclosed."
    ];
    enclosures = ["Copy of my credit report with the item circled", ...enclosed.map((x) => `Copy of ${x.replace(/^(a |an |my |copy of |copies of )/i, "")}`)];
  } else {
    const to = tidyFact(answers.recipient);
    recipient = to ? [to] : [];
    salutation = to ? `Dear ${to}:` : "To whom it may concern:";
    const ref = tidyFact(answers.reference); if (ref) reference.push(`Reference: ${ref}`);
    const when = tidyFact(answers.dates); if (when) reference.push(`Dates: ${when}`);
    const happened = tidySentences(answers.happened);
    if (!happened) blanks.push("What happened");
    const now = tidySentences(answers.now);
    paragraphs = [
      s.opening,
      happened || "[Say what happened, in two or three plain sentences]",
      ...(now ? [now] : []),
      `${enclosed.length ? "The documents listed below are enclosed to support these facts. " : ""}Everything in this letter is true to the best of my knowledge. ${s.closing}`
    ];
    enclosures = enclosed.map(cap);
  }

  const letter = { situation: s.id, kind: s.kind, highlight: s.kind === "dispute" ? 1 : -1, sender, date, recipient, subject: s.subject, reference, salutation, paragraphs, closing: "Sincerely,", signature: name, enclosures, blanks };
  return { ...letter, text: letterText(letter) };
}

export function letterText(l) {
  const out = [...l.sender, "", l.date, ""];
  if (l.recipient.length) out.push(...l.recipient, "");
  out.push(`Re: ${l.subject}`, ...l.reference, "", l.salutation, "");
  for (const p of l.paragraphs) out.push(p, "");
  out.push(l.closing, "", "", l.signature);
  if (l.enclosures.length) out.push("", l.enclosures.length === 1 ? `Enclosure: ${l.enclosures[0]}` : "Enclosures:", ...(l.enclosures.length === 1 ? [] : l.enclosures.map((e) => `- ${e}`)));
  return out.join("\n");
}
