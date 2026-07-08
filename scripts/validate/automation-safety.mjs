#!/usr/bin/env node
import fs from 'node:fs';
const policy = JSON.parse(fs.readFileSync('data/automation/automation_policy.json','utf8'));
for(const key of ['autoSafe','approvalRequired','blocked']) if(!Array.isArray(policy[key]) || policy[key].length === 0){ console.error(`[automation-safety] ${key} missing`); process.exit(1); }
const mustApprove = ['regulated_credit_content','payment_flow_change','download_template_change','prompt_guardrail_change','pricing_change'];
for(const item of mustApprove) if(!policy.approvalRequired.includes(item)){ console.error(`[automation-safety] approvalRequired missing ${item}`); process.exit(1); }
const mustBlock = ['guarantee_approval','claim_credit_repair_service','claim_citation_win_without_evidence'];
for(const item of mustBlock) if(!policy.blocked.includes(item)){ console.error(`[automation-safety] blocked missing ${item}`); process.exit(1); }
console.log('[automation-safety] OK');
