#!/usr/bin/env node
import fs from "node:fs";
const dataset=JSON.parse(fs.readFileSync("data/reports/document_readiness_index/coded_dataset.json","utf8"));
const records=dataset.records||[]; // Was: throw on anything other than exactly 100 records. That crashed the build
// on normal content growth and produced a stack trace instead of a message.
const RECORD_FLOOR=100;
if(records.length<RECORD_FLOOR){console.error(`[document-readiness] records regressed below floor ${RECORD_FLOOR}, got ${records.length}`);process.exit(1);}
const ids=new Set(), urls=new Set(); for(const r of records){if(ids.has(r.recordId)||urls.has(r.sourceUrl))throw new Error(`duplicate report record ${r.recordId}`);ids.add(r.recordId);urls.add(r.sourceUrl);}
const count=(field)=>records.reduce((m,r)=>(m[r[field]]=(m[r[field]]||0)+1,m),{});
const findings=JSON.parse(fs.readFileSync("data/reports/document_readiness_index/findings.json","utf8"));
findings.generatedAt=new Date().toISOString(); findings.sampleSize=records.length; findings.categoryCounts=count("category"); findings.formatCounts=count("format"); findings.sourceTypeCounts=count("sourceType"); findings.deepCodedPrimarySources=records.filter(r=>r.deepContentCoding).length;
fs.writeFileSync("data/reports/document_readiness_index/findings.json",JSON.stringify(findings,null,2)+"\n");
const headers=["recordId","category","organization","sourceUrl","format","sourceType","accessDate","reviewDepth","deepContentCoding","observedPreparationSignals"];
const esc=(v)=>{const s=Array.isArray(v)?v.join("; "):String(v??"");return /[\",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s};
const lines=[headers.join(","),...records.map(r=>headers.map(h=>esc(r[h])).join(","))]; fs.mkdirSync("public/reports",{recursive:true}); fs.writeFileSync("public/reports/document-readiness-index-2026.csv",lines.join("\n")+"\n");
console.log(`[document-readiness-index] OK records=${records.length} deep=${findings.deepCodedPrimarySources}`);
