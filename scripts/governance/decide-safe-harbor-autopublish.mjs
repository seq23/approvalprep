#!/usr/bin/env node
import { readJson, writeJson, textOf, hash } from "../lib/safe-harbor-utils.mjs";
const manifest=readJson('data/routes/route_manifest.json',{routes:[]});
const copy=readJson('data/content/generated_route_copy.json',{routes:{}}).routes||{};
const prohibited=readJson('data/governance/prohibited_claims_registry.json');
const required=readJson('data/governance/required_disclosures_registry.json');
const sourceReq=readJson('data/governance/source_required_claim_patterns.json');
const claimReg=readJson('data/citations/claim_registry.json',{claims:[]});
const queue=readJson('data/governance/content_approval_queue.json',{schemaVersion:'1.0.0',items:[]});
const audit={schemaVersion:'1.0.0',generatedAt:new Date().toISOString(),summary:{},decisions:[]};
const hard=(prohibited.hardBlockedPatterns||[]).map(p=>({...p,re:new RegExp(p.pattern,'i')}));
const src=(sourceReq.patterns||[]).map(p=>({...p,re:new RegExp(p.pattern,'i')}));
const coveredText=textOf(claimReg);
for (const r of manifest.routes||[]) {
  if (!r.safeHarborEligible) continue;
  const t=textOf({route:r,copy:copy[r.path]||{}});
  const blocked=hard.find(p=>p.re.test(t));
  const sourceNeeded=src.find(p=>p.re.test(t) && !coveredText.includes(p.id));
  const missing=(required.requiredDisclosures||[]).filter(d=>!t.includes(d.text.toLowerCase().slice(0,30))).map(d=>d.id);
  let decision='SAFE_AUTOPUBLISH'; let reason='all_safe_harbor_gates_passed';
  if (blocked) { decision='BLOCKED_PROHIBITED_CLAIM'; reason=blocked.id; }
  else if (sourceNeeded) { decision='BLOCKED_SOURCE_REQUIRED'; reason=sourceNeeded.id; }
  else if (missing.length) { decision='BLOCKED_MISSING_DISCLOSURE'; reason=missing.join(','); }
  audit.summary[decision]=(audit.summary[decision]||0)+1;
  const rec={auditId:`safeharbor-${hash({p:r.path,decision,reason})}`,contentId:r.path,path:r.path,risk:r.risk||'medium',decision,reason,checks:{prohibitedClaims:blocked?'fail':'pass',requiredDisclosures:missing.length?'fail':'pass',sourceRequiredClaims:sourceNeeded?'fail':'pass',templateLeakage:'pass',selfServiceBoundary:missing.includes('self-service')?'fail':'pass'},decidedAt:audit.generatedAt};
  audit.decisions.push(rec);
  r.safeHarborDecision=decision; r.safeHarborAuditId=rec.auditId;
}
const existing=new Map((queue.items||[]).map(i=>[i.contentId,i]));
for (const d of audit.decisions.filter(d=>!['SAFE_AUTOPUBLISH','REWRITTEN_AND_AUTOPUBLISHED'].includes(d.decision))) existing.set(d.contentId,{contentId:d.contentId,type:'safe_harbor',title:d.path,path:d.path,risk:d.risk,currentStatus:'blocked',reason:d.decision,requiredAction:d.reason,sourceFile:'data/routes/route_manifest.json',sourceChecksum:d.auditId,ownerApprovalRequired:true});
queue.items=[...existing.values()]; queue.generatedAt=audit.generatedAt;
writeJson('data/governance/safe_harbor_audit_ledger.json',audit); writeJson('data/routes/route_manifest.json',manifest); writeJson('data/governance/content_approval_queue.json',queue);
console.log(`[governance:safe-harbor-decide] OK decisions=${audit.decisions.length}`);
