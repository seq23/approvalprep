#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const b=readJson("data/intelligence/backlink_recommendations.json"); const allowed=["NO_BACKLINK_NEEDED","INTERNAL_LINKS_FIRST","SOURCE_AUTHORITY_FIRST","DIGITAL_PR_RECOMMENDED","BACKLINKS_REQUIRED_TO_COMPETE","PAID_BACKLINK_DATA_NEEDED"];
for(const r of b.recommendations){ if(!allowed.includes(r.recommendation)) fail(`[backlink-recommendation-honesty] invalid recommendation ${r.recommendation}`); if(r.recommendation==="BACKLINKS_REQUIRED_TO_COMPETE" && !/evidence/i.test(r.reason||"")) fail("[backlink-recommendation-honesty] hard backlink claims require evidence"); }
console.log("[backlink-recommendation-honesty] OK");
