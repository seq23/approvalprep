#!/usr/bin/env node
import { readJson, textOf } from '../lib/safe-harbor-utils.mjs';
const reg=readJson('data/governance/prohibited_claims_registry.json');
const files=['data/content/generated_route_copy.json','data/content/generated_answers.json','data/templates/template_registry.json','data/atoms/answer_atoms.json','data/atoms/citation_targets.json','data/reports/public_report_registry.json','data/tools/tool_registry.json'];
const text=textOf(files.map(f=>readJson(f,{})));
const safeContext = (idx) => {
  const window = text.slice(Math.max(0, idx - 80), idx + 120);
  return /does not|do not|not a|no fake|no guarantee|without|avoid|expecting|common mistakes|must not|should not/.test(window);
};
for (const p of reg.hardBlockedPatterns||[]) {
  const re = new RegExp(p.pattern,'ig'); let m;
  while ((m = re.exec(text))) {
    if (!safeContext(m.index)) throw new Error(`hard prohibited claim detected: ${p.id}`);
  }
}
console.log('[validate:prohibited-claims] OK');
