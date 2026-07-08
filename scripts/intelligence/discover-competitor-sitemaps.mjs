#!/usr/bin/env node

import {readJson,writeJson,appendRun,now} from "./_lib.mjs";
const connectorId="competitor_sitemap_discovery"; const watch=readJson("data/intelligence/competitor_watchlist.json",{competitors:[]}).competitors.filter(c=>c.allowed); const deltas=[];
for(const c of watch){ const base=c.baseUrl.replace(/\/$/,""); let found=[]; for(const path of ["/robots.txt","/sitemap.xml"]){ try{ const res=await fetch(base+path); const text=await res.text(); found.push({path,status:res.status,sitemapMentions:[...text.matchAll(/Sitemap:\s*(\S+)/gi)].map(m=>m[1]).slice(0,20),urlCount:(text.match(/<loc>/g)||[]).length}); }catch(e){ found.push({path,status:"SOURCE_ERROR",error:e.message}); } } deltas.push({competitorId:c.id,baseUrl:base,found,checkedAt:now()}); }
writeJson("data/intelligence/competitor_structure_deltas.json",{schemaVersion:"4.1.0",deltas}); appendRun(connectorId,deltas.length?"COMPLETE":"NO_DATA",{recordsImported:deltas.length}); console.log(JSON.stringify({connectorId,status:deltas.length?"COMPLETE":"NO_DATA",recordsImported:deltas.length},null,2));
