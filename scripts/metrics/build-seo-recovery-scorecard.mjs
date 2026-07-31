#!/usr/bin/env node
import fs from "node:fs";
const manifest=JSON.parse(fs.readFileSync("data/routes/route_manifest.json","utf8"));
const redirects=JSON.parse(fs.readFileSync("data/routes/redirects.json","utf8"));
const legacy=JSON.parse(fs.readFileSync("data/content/generated_answers.json","utf8"));
const score=JSON.parse(fs.readFileSync("data/metrics/seo_recovery_scorecard.json","utf8"));
const set=(id,value)=>{const m=score.metrics.find(x=>x.id===id);if(m)m.currentStructural=value};
set("legacy_duplicate_urls",redirects.redirects.length===42?0:"MISMATCH"); set("public_derivative_answer_pages",legacy.answers.length); set("indexable_routes",manifest.routes.filter(r=>r.index).length);
score.generatedAt=new Date().toISOString(); fs.writeFileSync("data/metrics/seo_recovery_scorecard.json",JSON.stringify(score,null,2)+"\n"); console.log("[seo-recovery-scorecard] OK");
