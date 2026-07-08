#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const b=readJson("data/intelligence/growth_maintenance_briefs.json"); for(const x of b.briefs){ if(!x.route||!x.recommendedFix||typeof x.priorityScore!=="number") fail("[maintenance-brief-integrity] malformed maintenance brief"); }
console.log("[maintenance-brief-integrity] OK");
