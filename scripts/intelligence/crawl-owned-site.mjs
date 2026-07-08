#!/usr/bin/env node

import fs from "node:fs"; import {readJson,writeJson,appendRun,now} from "./_lib.mjs";
const connectorId="owned_site_crawler"; const routes=readJson("data/routes/route_manifest.json",{routes:[]}).routes; const pages=routes.map(r=>({route:r.path,index:r.index!==false,family:r.family||r.pageFamily||"unknown",source:"route_manifest",checkedAt:now()})); writeJson("data/intelligence/owned_site_crawl.json",{schemaVersion:"4.1.0",pages}); appendRun(connectorId,pages.length?"COMPLETE":"NO_DATA",{recordsImported:pages.length}); console.log(JSON.stringify({connectorId,status:pages.length?"COMPLETE":"NO_DATA",recordsImported:pages.length},null,2));
