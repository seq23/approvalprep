#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const runs=readJson("data/intelligence/ingestion_runs.json"); if(!Array.isArray(runs.runs)) fail("[intelligence-source-freshness] runs array missing");
// NOT_AUTHORIZED means the provider answered and refused - URL Inspection needs
// site ownership and the shared service account is only siteFullUser. It is a
// settled state a connector can legitimately report, not an unknown one. Any
// new status a connector emits has to be registered here or this validator
// hard-fails the run, which is the point of it.
for(const r of runs.runs){ if(!["COMPLETE","COMPLETE_FIXTURE","NOT_CONFIGURED","SOURCE_ERROR","NO_DATA","BUDGET_HELD","NOT_AUTHORIZED"].includes(r.status)) fail(`[intelligence-source-freshness] invalid status ${r.status}`); }
console.log("[intelligence-source-freshness] OK");
