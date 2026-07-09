#!/usr/bin/env node
import fs from 'node:fs';
const strategy = JSON.parse(fs.readFileSync('data/strategy/citation_growth_strategy.json','utf8'));
let opportunities = {briefs:[]}; try { opportunities = JSON.parse(fs.readFileSync('data/intelligence/content_opportunity_briefs.json','utf8')); } catch {}
let targets = {targets:[]}; try { targets = JSON.parse(fs.readFileSync('data/atoms/citation_targets.json','utf8')); } catch {}
let atoms = {atoms:[]}; try { atoms = JSON.parse(fs.readFileSync('data/atoms/answer_atoms.json','utf8')); } catch {}
const plannedGoalTargets = strategy.monthlyPlan.reduce((sum,m)=>sum+(m.targetSurfaces||0),0);
const opportunitiesDetected = (opportunities.briefs||[]).length;
const kpi = {schemaVersion:'4.3.1', plannedGoalTargets, generatedCitationTargets:(targets.targets||[]).length, generatedAtoms:(atoms.atoms||[]).length, opportunitiesDetected, observedWins:0, observedWinsProof:[], lastUpdated:new Date().toISOString(), claimPolicy:'100K is a six-month planning target, not an observed citation claim. Observed wins require telemetry or manual proof and cannot be inferred from targets.'};
fs.writeFileSync('data/strategy/citation_kpi_registry.json', JSON.stringify(kpi,null,2)+'\n');
console.log(JSON.stringify({status:'OK', plannedGoalTargets, generatedCitationTargets:kpi.generatedCitationTargets, generatedAtoms:kpi.generatedAtoms, opportunitiesDetected, observedWins:0},null,2));
