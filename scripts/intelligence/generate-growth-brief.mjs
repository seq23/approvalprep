#!/usr/bin/env node

import {readJson,writeJson,appendRun,now} from "./_lib.mjs";
const connectorId="growth_brief_generation"; const content=readJson("data/intelligence/content_opportunity_briefs.json",{briefs:[]}).briefs; const maint=readJson("data/intelligence/growth_maintenance_briefs.json",{briefs:[]}).briefs; const runs=readJson("data/intelligence/ingestion_runs.json",{runs:[]}).runs; 
// The shortlist used to sort on userUtilityScore + searchOpportunityScore, which
// reads as "usefulness plus demand". searchOpportunityScore is 0 on every brief
// because none of them joins a Search Console row, so the demand half of that
// sum contributed nothing while making the ordering look measured. A zero still
// sorts; that is exactly how a number that measures nothing ends up driving
// behaviour.
//
// The sort is unchanged in effect - it was always userUtilityScore alone - but
// the demand term is now only admitted when it is actually measured, and the
// brief carries a named stop saying so rather than a silent zero.
const measuredCount = content.filter((b) => Number(b.searchOpportunityScore) > 0).length;
const measuredTerm = (b) => (measuredCount ? Number(b.searchOpportunityScore) || 0 : 0);
const rankingBasis = measuredCount
  ? {status:"MEASURED_DEMAND_INCLUDED", rankedBy:"userUtilityScore + searchOpportunityScore", measuredBriefs:measuredCount}
  : {status:"DEMAND_UNMEASURED", rankedBy:"userUtilityScore only (heuristic regex keyword rules)", measuredBriefs:0,
     note:"searchOpportunityScore is 0 on all "+content.length+" briefs, so no measured demand entered this ranking. This shortlist is a usefulness heuristic and must not be read as demand."};
if (!measuredCount) console.log(`[growth-brief] NAMED STOP DEMAND_UNMEASURED: ranking ${content.length} briefs by heuristic usefulness only; no measured search demand is available to rank on.`);
const brief={schemaVersion:"4.2.0",generatedAt:now(),sourceStatus:runs.slice(0,20),topContentOpportunities:content.slice().sort((a,b)=>(b.userUtilityScore+measuredTerm(b))-(a.userUtilityScore+measuredTerm(a))).slice(0,20),rankingBasis,topMaintenanceActions:maint.sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,20),hardTruth:"Low ranking potential never blocks useful onsite content. It only changes indexing, priority, and authority strategy."}; writeJson("data/intelligence/latest_growth_brief.json",brief); appendRun(connectorId,"COMPLETE",{recordsImported:brief.topContentOpportunities.length+brief.topMaintenanceActions.length}); console.log(JSON.stringify({connectorId,status:"COMPLETE",recordsImported:brief.topContentOpportunities.length+brief.topMaintenanceActions.length},null,2));
