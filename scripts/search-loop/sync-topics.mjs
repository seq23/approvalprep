#!/usr/bin/env node
// Feeds the content-opportunity registry into the search loop's finder.
//
// data/intelligence/citation_opportunity_registry.json holds thousands of fanned-out
// phrasings ("how to prepare letter of explanation for renters with ..."); they are
// combinations, not searches, so they are never built as pages. What they carry is
// which subjects have open build/FAQ opportunities. This counts, for every subject in
// data/authority_scale/fanout_dimensions.json, how many open opportunities name it,
// and writes the busiest ones into search-loop.config.json `topics` (after the
// hand-picked core seeds, which always stay first). The engine's weekly FIND then seeds
// Google/Bing autocomplete from them, so real searches - not the synthetic phrasings -
// become pages.
//
// Rule 0: zero subjects matched is a hard failure (the registry or the dimension list
// changed shape), never a silent no-op.
import fs from "node:fs";

const CONFIG = "search-loop.config.json";
// Credit-repair buyers first (her ruling 3 Nov 2026: the search pages target people about to
// pay a monthly credit repair company; loop olp_m6jbamwwq5rbj46g).
const CORE = [
  "credit repair cost", "is credit repair worth it", "credit repair scams", "diy credit repair",
  "credit repair company alternatives", "credit saint alternative", "the credit pros alternative",
  "sky blue credit alternative", "dispute credit report yourself", "how to dispute a credit report error",
  "do credit repair companies work", "credit repair vs doing it yourself",
  "letter of explanation", "proof of employment letter", "employment verification letter",
  "rental application letter", "landlord reference letter", "goodwill letter", "609 dispute letter",
  "gift letter for mortgage", "hardship letter", "proof of income",
];
const MAX_TOPICS = 30;
const OPEN = new Set(["build_or_add_utility_content", "add_faq_section_or_checklist"]);

const registry = JSON.parse(fs.readFileSync("data/intelligence/citation_opportunity_registry.json", "utf8"));
const subjects = JSON.parse(fs.readFileSync("data/authority_scale/fanout_dimensions.json", "utf8")).topics || [];
const counts = new Map();
for (const o of registry.opportunities || []) {
  if (!OPEN.has(o.recommendedAction)) continue;
  const q = String(o.query || "").toLowerCase();
  for (const s of subjects) if (q.includes(String(s).toLowerCase())) counts.set(s, (counts.get(s) || 0) + 1);
}
if (!counts.size) {
  console.error("[search-loop:sync-topics] FAIL no fanout subject appears in an open opportunity; registry or dimensions changed shape");
  process.exit(1);
}
const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s.toLowerCase());
const topics = [...new Set([...CORE, ...ranked])].slice(0, MAX_TOPICS);
const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
const changed = JSON.stringify(cfg.topics) !== JSON.stringify(topics);
cfg.topics = topics;
fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n");
console.log(`[search-loop:sync-topics] OK subjects_with_open_opportunities=${counts.size} topics=${topics.length} changed=${changed}`);
