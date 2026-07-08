#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const s=readJson("data/intelligence/serp_manual_imports.json"); if(!Array.isArray(s.imports)) fail("[serp-import-schema] imports array missing"); console.log("[serp-import-schema] OK");
