#!/usr/bin/env node
import fs from "node:fs";
const data=JSON.parse(fs.readFileSync("data/routes/redirects.json","utf8"));
const fixed=[
  "https://www.approvalprep.com/* https://approvalprep.com/:splat 301",
  "https://letterofexplanation.com/* https://approvalprep.com/letter-of-explanation 301",
  "https://www.letterofexplanation.com/* https://approvalprep.com/letter-of-explanation 301",
  "https://employmentverificationletter.com/* https://approvalprep.com/employment-verification-letter 301",
  "https://www.employmentverificationletter.com/* https://approvalprep.com/employment-verification-letter 301",
  ""
];
const rows=(data.redirects||[]).sort((a,b)=>a.source.localeCompare(b.source)).map(r=>`${r.source} ${r.destination} ${r.statusCode}`);
fs.writeFileSync("public/_redirects",[...fixed,...rows,""].join("\n"));
console.log(`[redirects] OK internal=${rows.length}`);
