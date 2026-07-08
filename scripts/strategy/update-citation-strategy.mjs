#!/usr/bin/env node
import fs from 'node:fs';
const strategy = JSON.parse(fs.readFileSync('data/strategy/citation_growth_strategy.json','utf8'));
let opportunities = {briefs:[]}; try { opportunities = JSON.parse(fs.readFileSync('data/intelligence/content_opportunity_briefs.json','utf8')); } catch {}
const targetsCreated = strategy.monthlyPlan.reduce((sum,m)=>sum+(m.targetSurfaces||0),0);
const opportunitiesDetected = (opportunities.briefs||[]).length;
const kpi = {schemaVersion:'4.2.0', targetsCreated, opportunitiesDetected, observedWins:0, observedWinsProof:[], lastUpdated:new Date().toISOString(), claimPolicy:'Observed wins require telemetry or manual proof and cannot be inferred from targets.'};
fs.writeFileSync('data/strategy/citation_kpi_registry.json', JSON.stringify(kpi,null,2)+'\n');
console.log(JSON.stringify({status:'OK', targetsCreated, opportunitiesDetected, observedWins:0},null,2));
