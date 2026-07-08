#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const c=readJson("data/intelligence/citation_opportunity_registry.json"); if(!Array.isArray(c.opportunities)) fail("[citation-opportunity-integrity] opportunities array missing"); for(const o of c.opportunities){ if(/win|ranked|cited/i.test(o.proof||"")) fail("[citation-opportunity-integrity] citation wins require telemetry proof, not recommendations"); }
console.log("[citation-opportunity-integrity] OK");
