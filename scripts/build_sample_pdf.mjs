#!/usr/bin/env node
// Builds the free sample PDF (public/samples/letter-of-explanation-sample.pdf) with the same
// letter and PDF code the Letter Studio runs in the browser: a filled-in sample letter (every
// detail invented), then a short "before you write yours" page. Run: npm run build:sample-pdf
import { writeFileSync } from "node:fs";
import { buildLetter, SELF_HELP_LINE } from "../src/lib/letterStudioCore.mjs";
import { buildLetterPdf } from "../src/lib/letterPdf.mjs";

const letter = buildLetter("general", {
  name: "Jordan Lee",
  recipient: "Parkview Leasing Office",
  reference: "Rental application 2291",
  dates: "March to June 2025",
  happened: "My employer closed its Memphis office in March 2025 and I was out of work for ten weeks. During that time I paid two card bills late. I started a new full-time job on June 2, 2025.",
  now: "Both accounts have been current since July 2025 and I have set up automatic payments.",
  enclosures: "offer letter dated May 27, 2025; bank statements for July to October 2025"
}, { today: new Date(2026, 10, 10) });

const pdf = buildLetterPdf(letter, {
  banner: "SAMPLE LETTER OF EXPLANATION. Every name, date and detail below is made up.",
  footer: `ApprovalPrep (approvalprep.com). Free sample. ${SELF_HELP_LINE}`,
  sheet: {
    title: "Before you write yours",
    lines: [
      "Use only what is true and what you can show.",
      "Say what happened in two or three plain sentences. Leave out anything the reader did not ask about.",
      "Give the dates. A reader checks them against your file.",
      "Say what is different now.",
      "List what you are enclosing, and send copies, never originals.",
      "Keep it to one page, sign it and send it yourself."
    ],
    notes: ["Write your own free at approvalprep.com/letter-writing-studio/. The reader decides; a letter explains, it does not promise an approval.", SELF_HELP_LINE]
  }
});
writeFileSync("public/samples/letter-of-explanation-sample.pdf", pdf);
console.log(`[sample-pdf] OK ${pdf.length} bytes`);
