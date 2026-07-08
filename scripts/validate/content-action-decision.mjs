#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const b=readJson("data/intelligence/content_opportunity_briefs.json"); const statuses=["indexable_growth_page","indexable_utility_page","noindex_utility_page","product_flow_support","admin_only_resource","future_paid_source_needed","blocked_compliance_risk","blocked_duplicate_or_thin"];
for(const x of b.briefs){ if(!statuses.includes(x.admissionStatus)) fail(`[content-action-decision] invalid admission status ${x.admissionStatus}`); if(x.userUtilityScore>=65 && x.admissionStatus==="blocked_duplicate_or_thin") fail("[content-action-decision] high utility cannot be blocked solely for growth limits"); }
console.log("[content-action-decision] OK");
