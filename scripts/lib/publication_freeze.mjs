// The new-page publication freeze, read from data/cadence/policy.json
// `new_page_publication` (set 2026-10-09, made a flag 2026-10-11).
//
// Search Console showed 10 impressions and 0 clicks in 28 days while ~82% of
// commits were automated daily answers written to phrasings nobody had measured.
// While frozen, content:generate publishes a candidate only when its own query
// (the page title, normalised) is a target in
// data/search_intelligence/target_query_set.json with a measured number. The
// moment Search Console or a volume source measures that query, the next cycle
// publishes it with no one switching anything. validate:publication-freeze
// reads this module, the flag, the generator wiring and the release ledger.
import fs from "node:fs";

export const RELEASE_RULES = new Set(["measured_target_only"]);
export const STOP_CODE = "PUBLICATION_FROZEN_UNMEASURED_DEMAND";
export const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
export const containsQuery = (title, query) => ` ${norm(title)} `.includes(` ${norm(query)} `) && norm(query).length > 0;

const read = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback);

export function loadFreeze(policyFile = "data/cadence/policy.json") {
  return read(policyFile, {}).new_page_publication || null;
}

export function measuredTargets(targetFile = "data/search_intelligence/target_query_set.json") {
  const set = read(targetFile, { targets: [] });
  const map = new Map();
  for (const t of set.targets || []) {
    const value = Number(t?.measurement?.value);
    if (t?.source && value > 0) map.set(norm(t.query), t);
  }
  return map;
}

// One decision, used by the generator and exercised by the validator.
export function freezeDecision(candidate, freeze, targets) {
  if (!freeze || freeze.frozen !== true) return { allowed: true, reason: "not_frozen" };
  // A medium-lane page (scripts/lib/medium_lane.mjs) is a question built around a
  // measured query, so it names that query in measuredQuery and its title must
  // contain it word for word; every other page is matched on its title alone.
  const declared = candidate.measuredQuery?.query;
  if (declared && !containsQuery(candidate.title, declared)) return { allowed: false, reason: STOP_CODE, query: norm(declared) };
  const query = norm(declared || candidate.title);
  const target = targets.get(query);
  if (target) return { allowed: true, reason: "measured_target", query, source: target.source, value: target.measurement.value };
  return { allowed: false, reason: STOP_CODE, query };
}
