#!/usr/bin/env node
import fs from "node:fs";
const redirects=fs.readFileSync("public/_redirects","utf8");
const sitemap=fs.readFileSync("public/sitemap.xml","utf8");
const astro=fs.readFileSync("astro.config.mjs","utf8");
const failures=[];
// Host canonicalisation lives in functions/_middleware.js, not in _redirects.
// Cloudflare Pages matches _redirects by path and never reads the Host header, so
// the absolute-URL rule this used to require had never fired; scripts/routes/build-redirects.mjs
// removed it, and this check went on asserting its presence and failing for a
// defect that had already been fixed. Check the mechanism that can fire, and
// forbid the syntax that cannot.
if(/^\s*https?:\/\//m.test(redirects)) failures.push("_redirects has an absolute-URL source; Pages matches by path only, so it never fires");
const middleware=fs.existsSync("functions/_middleware.js")?fs.readFileSync("functions/_middleware.js","utf8"):"";
if(!middleware) failures.push("functions/_middleware.js is missing, so nothing canonicalises the host");
if(!middleware.includes('const CANONICAL_HOST = "approvalprep.com"')) failures.push("functions/_middleware.js does not canonicalise to approvalprep.com");
if(!/Response\.redirect\([^)]*301\)/.test(middleware)) failures.push("host canonicalisation must be a 301");
if(/https:\/\/www\.approvalprep\.com/.test(sitemap)) failures.push("www URL present in sitemap");
if(!astro.includes('site: "https://approvalprep.com"')) failures.push("Astro canonical site mismatch");
if(process.argv.includes("--live")){
  const checks=["https://www.approvalprep.com/employment-verification-letter?ap_check=1","https://approvalprep.pages.dev/employment-verification-letter?ap_check=1"];
  for(const url of checks){
    try{
      const response=await fetch(url,{redirect:"manual"});
      const location=response.headers.get("location")||"";
      if(![301,308].includes(response.status)) failures.push(`${url} returned ${response.status}, expected 301/308`);
      if(!location.startsWith("https://approvalprep.com/employment-verification-letter")) failures.push(`${url} target mismatch: ${location}`);
      if(!location.includes("ap_check=1")) failures.push(`${url} query not preserved`);
    }catch(error){ failures.push(`${url} live check failed: ${error.message}`); }
  }
}
if(failures.length){ console.error(JSON.stringify({status:"FAIL",failures},null,2)); process.exit(1); }
console.log(JSON.stringify({status:"OK",mode:process.argv.includes("--live")?"live_and_static":"static_only"},null,2));
