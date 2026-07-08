#!/usr/bin/env node

import {readJson,fail,walk} from "./_common.mjs";
for(const file of walk("data/intelligence").filter(f=>f.endsWith(".json"))){ const text=JSON.stringify(JSON.parse((await import("node:fs")).default.readFileSync(file,"utf8"))).toLowerCase(); if(/fake ranking|guaranteed citation|guaranteed indexing|placeholder competitor|lorem ipsum/.test(text)) fail(`[no-fake-intelligence-data] fake/placeholder claim in ${file}`); }
console.log("[no-fake-intelligence-data] OK");
