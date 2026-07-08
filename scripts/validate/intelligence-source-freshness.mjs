#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const runs=readJson("data/intelligence/ingestion_runs.json"); if(!Array.isArray(runs.runs)) fail("[intelligence-source-freshness] runs array missing");
for(const r of runs.runs){ if(!["COMPLETE","COMPLETE_FIXTURE","NOT_CONFIGURED","SOURCE_ERROR","NO_DATA"].includes(r.status)) fail(`[intelligence-source-freshness] invalid status ${r.status}`); }
console.log("[intelligence-source-freshness] OK");
