#!/usr/bin/env node
import fs from "node:fs";
const redirects=fs.readFileSync("public/_redirects","utf8");
const sitemap=fs.readFileSync("public/sitemap.xml","utf8");
const astro=fs.readFileSync("astro.config.mjs","utf8");
const failures=[];
if(!redirects.includes("https://www.approvalprep.com/* https://approvalprep.com/:splat 301")) failures.push("missing www to apex fallback");
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
