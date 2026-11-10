#!/usr/bin/env node
// The free Letter Studio: behaviour, not wording.
//  1. It stays $0 and browser-only: no network call, upload or model in its code.
//  2. Every situation builds a real letter in letter form, and a [bracket] appears only where she
//     left a needed fact out.
//  3. The credit dispute letter carries the chosen bureau's mail address, asks for a correction or
//     removal, lists enclosures, and promises nothing (risk R-ADV-13).
//  4. Every bureau address has a dated source.
//  5. The dispute PDF is a valid two-page file: the letter, then "Before you mail".
import fs from "node:fs";
import { fail, readJson } from "./_common.mjs";
import { studioSituations, bureaus, buildLetter, ANSWER_WINDOW, BEFORE_YOU_MAIL } from "../../src/lib/letterStudioCore.mjs";
import { buildLetterPdf } from "../../src/lib/letterPdf.mjs";

const manifest = readJson("data/routes/route_manifest.json");
const route = manifest.routes.find((item) => item.path === "/letter-writing-studio");
if (!route || !route.index || !route.nav || route.page_intent !== "free_tool") fail("[letter-studio] route must be indexed, nav-enabled free_tool");

const code = ["src/components/LetterStudio.astro", "src/lib/letterStudioCore.mjs", "src/lib/letterPdf.mjs", "src/data/letterStudio.ts"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const blocked of ["fetch(", "/api/", "XMLHttpRequest", "sendBeacon", "WebSocket", "openai", "anthropic", "gemini", "perplexity", "type=\"file\"", "FormData", "localStorage", "indexedDB", "document.cookie"]) {
  if (code.includes(blocked)) fail(`[letter-studio] the free Studio must stay $0 and browser-only; found ${blocked}`);
}

if (studioSituations.length < 8) fail(`[letter-studio] only ${studioSituations.length} situations`);
const today = new Date(2026, 10, 10);
const full = { name: "jordan lee", address: "12 Oak St\nMemphis, TN 38104", bureau: "experian", account: "capital one, ending 4471.", shows: "60 days late in march 2026", recipient: "Parkview Leasing", reference: "App 2291", dates: "march 2025", happened: "i lost my job in march. i caught up by june..", now: "i have worked at the same company for a year", enclosures: "bank statement, pay stubs" };
const promise = /\b(guarantee|will be removed|will remove|will raise|raise your score|boost|fix your credit|repair your credit|must remove|must delete|legally required to (remove|delete)|approved)\b/i;
for (const s of studioSituations) {
  const l = buildLetter(s.id, full, { today });
  const t = l.text;
  if (/undefined|null|\[object/.test(t)) fail(`[letter-studio] ${s.id}: broken value in letter`);
  if (/\[[^\]]+\]/.test(t) || l.blanks.length) fail(`[letter-studio] ${s.id}: a fully answered letter still has a bracket: ${l.blanks.join(", ")}`);
  if (/[.!?]{2,}|\bi\b/.test(t)) fail(`[letter-studio] ${s.id}: her words were not tidied (double stop or lone "i")`);
  if (promise.test(t)) fail(`[letter-studio] ${s.id}: letter promises or demands an outcome (R-ADV-13)`);
  const order = ["Jordan Lee", "November 10, 2026", `Re: ${s.subject}`, l.salutation, "Sincerely,", "Jordan Lee"];
  let at = -1;
  for (const part of order) { const next = t.indexOf(part, at + 1); if (next < 0) fail(`[letter-studio] ${s.id}: letter form broken, missing or out of order: ${part}`); at = next; }
  if (l.paragraphs.length < 3) fail(`[letter-studio] ${s.id}: fewer than three paragraphs`);
  if (!t.includes("I lost my job in March. I caught up by June.")) fail(`[letter-studio] ${s.id}: her own account is not in the letter as sentences`);
  // An empty form brackets exactly the needed facts and says which.
  const empty = buildLetter(s.id, {}, { today });
  const brackets = empty.text.match(/\[[^\]]+\]/g) || [];
  if (!empty.blanks.length || !brackets.length) fail(`[letter-studio] ${s.id}: an empty form must list its blanks`);
  if (!s.recommendationSku || !s.kitAdds) fail(`[letter-studio] ${s.id}: no kit named`);
}

const disputes = studioSituations.filter((s) => s.kind === "dispute");
if (disputes.length !== 1) fail("[letter-studio] exactly one credit dispute situation must exist");
if (bureaus.length !== 3) fail("[letter-studio] three bureaus expected");
for (const b of bureaus) {
  if (!/^https:\/\//.test(b.source?.url || "") || !/^\d{4}-\d{2}-\d{2}$/.test(b.source?.read || "")) fail(`[letter-studio] ${b.id}: mail address has no dated source`);
  const l = buildLetter(disputes[0].id, { ...full, bureau: b.id }, { today });
  for (const line of b.lines) if (!l.text.includes(line)) fail(`[letter-studio] ${b.id}: address line missing from the dispute letter: ${line}`);
  if (!/correct it, or remove it/.test(l.text) || !/investigat/.test(l.text)) fail(`[letter-studio] ${b.id}: dispute letter does not ask for an investigation and a correction or removal`);
  if (!l.text.includes("Capital one, ending 4471") || !l.text.includes("60 days late in March 2026")) fail(`[letter-studio] ${b.id}: the disputed item is not identified`);
  if (l.enclosures.length !== 3 || !/credit report with the item circled/.test(l.enclosures[0])) fail(`[letter-studio] ${b.id}: enclosures not listed`);
}
if (!/^https:\/\//.test(ANSWER_WINDOW.source.url) || !/30 days/.test(ANSWER_WINDOW.text)) fail("[letter-studio] the 30-day answer window must cite its source");

const pdf = Buffer.from(buildLetterPdf(buildLetter(disputes[0].id, full, { today }), { footer: "x", sheet: { title: "Before you mail", lines: BEFORE_YOU_MAIL } })).toString("latin1");
if (!pdf.startsWith("%PDF-1.4") || !pdf.trimEnd().endsWith("%%EOF") || !/\/Count 2\b/.test(pdf)) fail("[letter-studio] dispute PDF is not a valid two-page file");
const xref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);
if (pdf.slice(xref, xref + 4) !== "xref") fail("[letter-studio] dispute PDF cross-reference table is misplaced");
console.log(`[letter-studio] OK situations=${studioSituations.length} bureaus=${bureaus.length}`);
