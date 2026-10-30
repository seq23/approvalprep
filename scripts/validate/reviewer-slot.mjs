#!/usr/bin/env node
// The named-reviewer slot on loan-document pages (authority audit, 30 Oct 2026).
//
// ApprovalPrep is a YMYL finance site authored by an organization. A named,
// credentialed reviewer is the strongest E-E-A-T signal it could add, and the
// most dangerous one to fake. So the slot is data-driven and ships empty:
// src/data/reviewers.json lists real people who agreed in writing, and nothing
// else may name a person.
//
// This reads the published HTML and asserts:
//   - every reviewer entry is complete: name, credential, own profile url, and a
//     written-consent record (written: true, date, where it is kept);
//   - every listed loan-document path exists as a built page and shows the slot;
//   - while reviewers is empty: each loan-document page shows the editorial-desk
//     line linking /methodology/ and emits no reviewedBy;
//   - once reviewers exist: each loan-document page shows them and its JSON-LD
//     reviewedBy names exactly them;
//   - no page anywhere carries a Person in JSON-LD who is not a listed reviewer.
// Hard-fails on zero loan-document paths or zero built pages. An empty reviewer
// list is not a failure: it is the named stop REVIEWER_SLOT_EMPTY, printed on
// every run, which only the owner can clear by recruiting a real reviewer.
import fs from "node:fs";
import path from "node:path";
import { walk, fail, requireBuildOutput } from "./_common.mjs";

const NAME = "reviewer-slot";
const FILE = "src/data/reviewers.json";
const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), FILE), "utf8"));
const reviewers = Array.isArray(data.reviewers) ? data.reviewers : fail(`[${NAME}] FAIL: ${FILE} reviewers is not an array`);
const paths = Array.isArray(data.loan_document_paths) ? data.loan_document_paths : [];
if (paths.length === 0) fail(`[${NAME}] FAIL: ${FILE} lists zero loan_document_paths; the slot governs nothing`);

const failures = [];
for (const [i, person] of reviewers.entries()) {
  for (const key of ["name", "credential", "url"]) if (!person?.[key]) failures.push(`${FILE} reviewers[${i}] has no ${key}`);
  if (person?.consent?.written !== true || !person?.consent?.date || !person?.consent?.record) failures.push(`${FILE} reviewers[${i}] has no written-consent record (consent.written true, consent.date, consent.record)`);
}
const reviewerNames = new Set(reviewers.map((person) => person?.name));

const outDir = requireBuildOutput(NAME);
const pages = walk(outDir).filter((file) => file.endsWith(".html"));
if (pages.length === 0) fail(`[${NAME}] FAIL: found zero .html pages in ${outDir}`);

const jsonLdOf = (html) => {
  const out = [];
  for (const match of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.parse(match[1])); } catch { /* schema-entity-graph owns parse failures */ }
  }
  return out;
};
const collect = (value, test, out = []) => {
  if (Array.isArray(value)) value.forEach((v) => collect(v, test, out));
  else if (value && typeof value === "object") {
    if (test(value)) out.push(value);
    Object.values(value).forEach((v) => collect(v, test, out));
  }
  return out;
};
const isPerson = (node) => [].concat(node["@type"] ?? []).includes("Person");

// No unlisted Person on any page.
for (const file of pages) {
  const rel = path.relative(outDir, file);
  for (const person of collect(jsonLdOf(fs.readFileSync(file, "utf8")), isPerson)) {
    if (!reviewerNames.has(person.name)) failures.push(`${rel}: JSON-LD names a Person "${person.name}" who is not in ${FILE}`);
  }
}

// The slot on every loan-document page.
let slotted = 0;
for (const route of paths) {
  const file = path.join(outDir, route.replace(/^\/+/, ""), "index.html");
  if (!fs.existsSync(file)) { failures.push(`${route}: listed in ${FILE} but no built page at ${path.relative(process.cwd(), file)}`); continue; }
  const html = fs.readFileSync(file, "utf8");
  const reviewedBy = collect(jsonLdOf(html), (node) => "reviewedBy" in node).flatMap((node) => [].concat(node.reviewedBy));
  if (reviewers.length === 0) {
    if (!/data-reviewer-slot="editorial-desk"[^>]*>[^<]*<a href="\/methodology\/"/.test(html)) failures.push(`${route}: no editorial-desk reviewer line linking /methodology/`);
    if (reviewedBy.length) failures.push(`${route}: emits reviewedBy while ${FILE} lists no reviewer`);
  } else {
    if (!html.includes('data-reviewer-slot="named"')) failures.push(`${route}: the named reviewer line is missing`);
    for (const person of reviewers) if (!html.includes(person.name)) failures.push(`${route}: does not show reviewer ${person.name}`);
    const emitted = new Set(reviewedBy.map((node) => node?.name));
    if (emitted.size !== reviewerNames.size || [...reviewerNames].some((n) => !emitted.has(n))) failures.push(`${route}: reviewedBy ${JSON.stringify([...emitted])} differs from ${FILE}`);
  }
  slotted += 1;
}

if (failures.length) fail(`[${NAME}] FAIL: ${failures.length}\n` + failures.slice(0, 40).join("\n"));
const stop = reviewers.length === 0
  ? ` NAMED STOP REVIEWER_SLOT_EMPTY: no credentialed reviewer has agreed in writing; recruit one and add them with their consent record to ${FILE}`
  : "";
console.log(`[${NAME}] OK pages=${pages.length} loan_document_pages=${slotted} reviewers=${reviewers.length}${stop}`);
