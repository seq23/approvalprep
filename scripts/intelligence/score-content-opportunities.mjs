#!/usr/bin/env node

import {readJson,writeJson,appendRun,actionDecision,backlinkDecision,riskFor,now,safeScore} from "./_lib.mjs";
const connectorId="content_opportunity_analysis"; const baseQueries=readJson("data/atlas/query_universe.json",{queries:[]}).queries; const fanoutWindow=readJson("data/atlas/max_fanout_window.json",{queries:[]}).queries; const queries=[...baseQueries,...fanoutWindow]; const routes=readJson("data/routes/route_manifest.json",{routes:[]}).routes; const gsc=readJson("data/intelligence/gsc_search_analytics.json",{rows:[]}).rows; const routeText=routes.map(r=>`${r.path} ${r.title||""} ${r.family||""}`).join("\n").toLowerCase();
const briefs=queries.map(q=>{ const query=q.query||q.term||q.id||""; const g=gsc.find(row=>String(row.query).toLowerCase()===String(query).toLowerCase()); const searchScore=Math.min(100, safeScore(g?.impressions)/10 + safeScore(g?.clicks)*2); const hasRoute=routeText.includes(String(query).toLowerCase().split(" ").slice(0,3).join(" ")); const decision=actionDecision({query,hasRoute,searchScore,citationScore:q.citationOpportunityScore||0}); const format = /checklist|documents|steps/.test(query.toLowerCase()) ? "checklist_or_numbered_steps" : /compare|types|examples/.test(query.toLowerCase()) ? "table_or_list" : "faq_or_section"; return {id:`brief_${String(q.id||query).replace(/[^a-z0-9]+/gi,"_").toLowerCase()}`,query,route:q.route||null,pageFamily:q.family||q.pageFamily||"unknown",searchOpportunityScore:Math.round(searchScore),citationOpportunityScore:q.citationOpportunityScore||0,competitorGapScore:q.competitorGapScore||0,userUtilityScore:decision.userUtilityScore,productSupportScore:/letter|kit|template|checklist|download/i.test(query)?80:30,complianceRiskScore:riskFor(query)==="high"?95:riskFor(query)==="regulated"?65:20,authorityRequirementScore:searchScore>60?70:25,backlinkRequirement:backlinkDecision({searchScore,internalLinkScore:40,evidence:false}),recommendedAction:decision.recommendedAction,admissionStatus:decision.admissionStatus,bestFormat:format,adminReviewRequired:decision.admissionStatus.startsWith("blocked")||riskFor(query)!=="low",reason:decision.reason,createdAt:now()}; });

// Provenance, because these numbers were being read as demand.
//
// searchOpportunityScore is the only field here derived from measurement: it is
// built from data/intelligence/gsc_search_analytics.json, which holds 14 rows.
// No brief has ever joined one, so the column is 0 on all 5,430 rows - and a 0
// still sorts, so generate-growth-brief.mjs was adding it to a keyword score and
// presenting the sum as a publishing shortlist. citationOpportunityScore is not
// a measurement at all: scripts/authority_scale/build_fanout_window.mjs stamps
// the literal 50 on every fan-out row, which clears the >=45 admission
// threshold in _lib.mjs and is the sole reason 968 briefs carry
// "indexable_growth_page".
//
// The scores are left as they are - they are legitimate heuristics and the
// page factory does not use them - but the file now says what they are, and
// scripts/validate/opportunity-score-provenance.mjs fails the build if this
// block goes missing or stops matching the data.
const measuredBriefs = briefs.filter((b) => Number(b.searchOpportunityScore) > 0).length;
const provenance = {
  measuredDemandRows: gsc.length,
  briefsJoiningAMeasuredRow: measuredBriefs,
  searchOpportunityScore: measuredBriefs
    ? "derived from measured Search Console impressions and clicks"
    : "NOT MEASURED: no brief joins any Search Console row, so this column is 0 everywhere and must not be used to rank",
  citationOpportunityScore: "NOT MEASURED: a constant admission token (50) stamped by build_fanout_window.mjs, not an observation",
  userUtilityScore: "heuristic: regex keyword rules",
  productSupportScore: "heuristic: regex keyword rules",
  complianceRiskScore: "heuristic: regex risk classification",
  authorityRequirementScore: "heuristic: threshold on searchOpportunityScore",
  competitorGapScore: "NOT MEASURED: always 0; no competitor data source is wired",
  totalsAreNotDemand: "Summing these fields yields a score, never a search volume. Measured demand lives in data/demand/measured_demand.json and is read through scripts/lib/demand_gate.mjs.",
};
if (!measuredBriefs) console.log(`[content-opportunity-analysis] NAMED STOP DEMAND_UNMEASURED: ${briefs.length} briefs scored, 0 joined any of the ${gsc.length} measured Search Console row(s). These are heuristic scores, not demand.`);
writeJson("data/intelligence/content_opportunity_briefs.json",{schemaVersion:"4.2.0",provenance,briefs}); appendRun(connectorId,briefs.length?"COMPLETE":"NO_DATA",{recordsImported:briefs.length}); console.log(JSON.stringify({connectorId,status:briefs.length?"COMPLETE":"NO_DATA",recordsImported:briefs.length},null,2));
