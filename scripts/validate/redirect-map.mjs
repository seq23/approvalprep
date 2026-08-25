#!/usr/bin/env node
import fs from "node:fs";
const fail=(m)=>{console.error(m);process.exit(1)};
const manifest=JSON.parse(fs.readFileSync("data/routes/route_manifest.json","utf8"));
const routes=new Set(manifest.routes.map(r=>r.path));
const data=JSON.parse(fs.readFileSync("data/routes/redirects.json","utf8"));
const file=fs.readFileSync("public/_redirects","utf8");
const seen=new Set();
// Floor, not an exact count: adding a legacy redirect is normal maintenance and
// must not fail the build. Losing redirects silently is the real regression.
const REDIRECT_FLOOR=42;
if((data.redirects||[]).length<REDIRECT_FLOOR) fail(`[redirect-map] redirects regressed below floor ${REDIRECT_FLOOR}, got ${(data.redirects||[]).length}`);
for(const r of data.redirects||[]){
 if(seen.has(r.source)) fail(`[redirect-map] duplicate ${r.source}`); seen.add(r.source);
 if(r.statusCode!==301) fail(`[redirect-map] non-301 ${r.source}`);
 if(!routes.has(r.destination)) fail(`[redirect-map] unknown destination ${r.destination}`);
 if(!file.includes(`${r.source} ${r.destination} 301`)) fail(`[redirect-map] _redirects missing ${r.source}`);
}
if(!file.includes("https://www.approvalprep.com/* https://approvalprep.com/:splat 301")) fail("[redirect-map] missing canonical host fallback");
console.log(`[redirect-map] OK redirects=${seen.size}`);
