#!/usr/bin/env node
import fs from 'node:fs';
const strategy = JSON.parse(fs.readFileSync('data/strategy/citation_growth_strategy.json','utf8'));
const kpi = JSON.parse(fs.readFileSync('data/strategy/citation_kpi_registry.json','utf8'));
if(strategy.goal.targetCitationOpportunities !== 100000 || strategy.goal.timeframeMonths > 6 || strategy.goal.guaranteed !== false){ console.error('[citation-strategy] 100K/6-month/no-guarantee target not encoded correctly'); process.exit(1); }
if(!strategy.kpiDefinitions?.targets || !strategy.kpiDefinitions?.opportunities || !strategy.kpiDefinitions?.observedWins){ console.error('[citation-strategy] KPI definitions must separate targets/opportunities/wins'); process.exit(1); }
if(kpi.observedWins > 0 && (!Array.isArray(kpi.observedWinsProof) || kpi.observedWinsProof.length === 0)){ console.error('[citation-strategy] Observed wins require proof'); process.exit(1); }
console.log('[citation-strategy] OK');
