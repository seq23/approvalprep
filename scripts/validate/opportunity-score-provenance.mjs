#!/usr/bin/env node
/**
 * A number that drives a decision has to say where it came from.
 *
 * `data/intelligence/content_opportunity_briefs.json` holds 5,430 briefs, each
 * carrying seven numeric scores. Two of them are named as if they were
 * observations and are not:
 *
 *   searchOpportunityScore   built from data/intelligence/gsc_search_analytics.json,
 *                            which holds 14 rows. No brief joins one, so the column
 *                            is 0 on every row.
 *   citationOpportunityScore the literal 50, stamped on every fan-out row by
 *                            scripts/authority_scale/build_fanout_window.mjs. It
 *                            clears the >=45 admission threshold in
 *                            scripts/intelligence/_lib.mjs, which is the entire
 *                            reason 968 briefs are labelled "indexable_growth_page".
 *
 * `generate-growth-brief.mjs` ranked its top-20 publishing shortlist on
 * `userUtilityScore + searchOpportunityScore`. A zero still sorts, so the demand
 * half of that sum contributed nothing while making the ordering look measured.
 *
 * This validator does not object to heuristics. It objects to heuristics that
 * are unlabelled at the point where they steer publishing. It enforces:
 *
 *   1. the briefs file declares a provenance block
 *   2. that block's claim about measured coverage matches the actual data
 *   3. when nothing is measured, the growth brief carries the DEMAND_UNMEASURED
 *      named stop rather than a silent zero
 *   4. the ranking basis the growth brief declares matches what is measurable
 *
 * Zero items examined is a failure, not a pass.
 */
import fs from "node:fs";

const errors = [];
let checks = 0;
const check = (label, ok, detail) => {
  checks += 1;
  if (!ok) errors.push(`${label}: ${detail}`);
};

const read = (p) => {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
};

const BRIEFS = "data/intelligence/content_opportunity_briefs.json";
const GROWTH = "data/intelligence/latest_growth_brief.json";

const briefsDoc = read(BRIEFS);
if (!briefsDoc) {
  console.error(`[opportunity-score-provenance] FAIL: ${BRIEFS} is missing or unreadable`);
  process.exit(1);
}
const briefs = Array.isArray(briefsDoc.briefs) ? briefsDoc.briefs : [];
check("briefs_present", briefs.length > 0, `${BRIEFS} holds no briefs; nothing to check`);

const prov = briefsDoc.provenance;
check("provenance_block_present", prov && typeof prov === "object",
  `${BRIEFS} carries no provenance block, so every consumer sees seven bare numbers with no statement of what they measure`);

const measured = briefs.filter((b) => Number(b.searchOpportunityScore) > 0).length;

if (prov && typeof prov === "object") {
  check("provenance_coverage_is_truthful", Number(prov.briefsJoiningAMeasuredRow) === measured,
    `provenance claims ${prov.briefsJoiningAMeasuredRow} briefs join a measured row; the data says ${measured}`);
  check("unmeasured_columns_are_named", /NOT MEASURED/.test(String(prov.citationOpportunityScore || "")),
    "citationOpportunityScore is a constant admission token, not an observation, and the provenance block must say so");
  if (!measured) {
    check("search_column_declared_unmeasured", /NOT MEASURED/.test(String(prov.searchOpportunityScore || "")),
      `searchOpportunityScore is 0 on all ${briefs.length} briefs but the provenance block does not declare it unmeasured`);
  }
}

const growth = read(GROWTH);
if (growth) {
  const basis = growth.rankingBasis;
  check("growth_brief_declares_ranking_basis", basis && typeof basis === "object",
    `${GROWTH} presents a top-20 publishing shortlist without declaring what it was ranked on`);
  if (basis && typeof basis === "object") {
    const expected = measured ? "MEASURED_DEMAND_INCLUDED" : "DEMAND_UNMEASURED";
    check("ranking_basis_matches_the_data", basis.status === expected,
      `growth brief declares rankingBasis.status="${basis.status}" but ${measured} brief(s) carry measured demand, so it must be "${expected}"`);
    check("ranking_basis_counts_match", Number(basis.measuredBriefs) === measured,
      `growth brief claims ${basis.measuredBriefs} measured briefs; the data says ${measured}`);
    if (!measured) {
      check("unmeasured_ranking_is_not_called_demand", !/searchOpportunityScore/.test(String(basis.rankedBy || "")),
        `growth brief says it ranked by "${basis.rankedBy}" while no brief carries measured demand; a 0 that sorts is a number driving behaviour while measuring nothing`);
    }
  }
}

if (checks === 0) {
  console.error("[opportunity-score-provenance] FAIL: examined zero artifacts - refusing to pass");
  process.exit(1);
}

if (errors.length) {
  console.error(`[opportunity-score-provenance] FAIL (${checks} checks)`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`[opportunity-score-provenance] OK ${checks} checks; ${briefs.length} briefs, ${measured} joining measured demand`);
