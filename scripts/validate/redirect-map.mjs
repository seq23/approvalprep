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
const servingForm=(p)=>{const last=String(p).split("/").pop()||"";return /\.[a-z0-9]+$/i.test(last)?p:`${String(p).replace(/\/+$/,"")}/`;};
for(const r of data.redirects||[]){
 if(seen.has(r.source)) fail(`[redirect-map] duplicate ${r.source}`); seen.add(r.source);
 if(r.statusCode!==301) fail(`[redirect-map] non-301 ${r.source}`);
 if(!routes.has(r.destination)) fail(`[redirect-map] unknown destination ${r.destination}`);
 // Both source forms, and the 200-serving destination. Emitting only the
 // slash-less source left the indexed trailing-slash URL returning 404, and a
 // slash-less destination made the crawler take a second hop through the 308.
 const destination=servingForm(r.destination);
 const bare=String(r.source).replace(/\/+$/,"");
 for(const source of [bare, `${bare}/`]){
  if(!file.includes(`\n${source} ${destination} 301\n`)) fail(`[redirect-map] _redirects missing "${source} ${destination} 301" (run npm run routes:redirects)`);
 }
}
// Host canonicalisation used to be asserted here as an absolute-URL rule inside
// _redirects. That rule never fired - Cloudflare Pages matches _redirects by
// path and never reads the Host header - so this assertion was green while
// www.approvalprep.com served the entire site at 200 next to the apex. It now
// checks the thing that can actually do the job, and forbids the syntax that
// could not.
const middleware="functions/_middleware.js";
if(!fs.existsSync(middleware)) fail(`[redirect-map] ${middleware} is missing; nothing canonicalises the Host header, so www and the parked domains serve the site at 200`);
const mw=fs.readFileSync(middleware,"utf8");
if(!/CANONICAL_HOST\s*=\s*"approvalprep\.com"/.test(mw)) fail(`[redirect-map] ${middleware} does not declare approvalprep.com as the canonical host`);
if(!/Response\.redirect\([^)]*301\)/.test(mw)) fail(`[redirect-map] ${middleware} does not issue a 301; a canonical tag is a hint where a 301 is a directive`);
for(const line of file.split("\n")){
 const t=line.trim();
 if(!t||t.startsWith("#")) continue;
 if(t.split(/\s+/)[0].startsWith("http")) fail(`[redirect-map] _redirects contains an absolute-URL source (${t.split(/\s+/)[0]}); Pages never matches those, use functions/_middleware.js`);
}
console.log(`[redirect-map] OK redirects=${seen.size} rulesEmitted=${file.split("\n").filter(l=>l.trim()&&!l.trim().startsWith("#")).length} hostCanonicalisation=functions/_middleware.js`);
