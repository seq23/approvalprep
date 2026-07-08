#!/usr/bin/env node

import fs from "node:fs"; import {readJson,exists,fail} from "./_common.mjs";
const reg=readJson("data/intelligence/source_connector_registry.json");
for(const c of reg.connectors){ if(!c.id||!c.script||!exists(c.script)) fail(`[source-connectors-real] missing real script for ${c.id}`); const src=fs.readFileSync(c.script,"utf8"); if(/TODO|STUB|MOCK|FAKE_SAMPLE|sampleData/i.test(src)) fail(`[source-connectors-real] forbidden placeholder marker in ${c.script}`); if(!/(fetch\(|fs\.readFileSync|readJson\(|statusOnly\()/s.test(src)) fail(`[source-connectors-real] ${c.script} does not call/import/read a real source or return an honest status`); }
console.log("[source-connectors-real] OK");
