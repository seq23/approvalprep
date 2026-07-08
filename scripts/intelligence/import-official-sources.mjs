#!/usr/bin/env node

import {readJson,writeJson,appendRun,now} from "./_lib.mjs";
const connectorId="official_source_fetcher"; const sources=readJson("data/citations/source_registry.json",{sources:[]}).sources.filter(s=>s.url&&/^https?:/.test(s.url)); const snapshots=[];
for(const s of sources.slice(0,50)){ try{ const res=await fetch(s.url,{headers:{"User-Agent":"ApprovalPrepBot/1.0 source verification; contact hello@approvalprep.com"}}); const text=await res.text(); snapshots.push({sourceId:s.id,url:s.url,status:res.status,title:(text.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]||"").trim().slice(0,160),checkedAt:now()}); }catch(e){ snapshots.push({sourceId:s.id,url:s.url,status:"SOURCE_ERROR",error:e.message,checkedAt:now()}); } }
writeJson("data/intelligence/official_source_snapshots.json",{schemaVersion:"4.1.0",snapshots}); appendRun(connectorId,snapshots.length?"COMPLETE":"NO_DATA",{recordsImported:snapshots.length}); console.log(JSON.stringify({connectorId,status:snapshots.length?"COMPLETE":"NO_DATA",recordsImported:snapshots.length},null,2));
