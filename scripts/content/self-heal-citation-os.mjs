#!/usr/bin/env node
import fs from 'node:fs';
const read = (p) => JSON.parse(fs.readFileSync(p,'utf8'));
const write = (p,d) => fs.writeFileSync(p, JSON.stringify(d,null,2)+'\n');
const now = new Date().toISOString();
const slug = (v) => String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,60) || 'approvalprep';
const manifest = read('data/routes/route_manifest.json');
const generated = read('data/content/generated_route_copy.json');
const admissions = read('data/atlas/route_admission_manifest.json');
const families = read('data/atlas/page_family_registry.json');
const queries = read('data/atlas/query_universe.json');
const matrix = read('data/atlas/query_matrix.json');
const fanout = read('data/atlas/fanout_query_map.json');
const atoms = read('data/atoms/answer_atoms.json');
const usage = read('data/atoms/atom_usage_map.json');
const sourceMap = read('data/atoms/atom_source_map.json');
const targets = read('data/atoms/citation_targets.json');
const familyIds = new Set((families.pageFamilies||[]).map(f=>f.id));
for (const id of ['tools','templates','public_reports']) {
  if (!familyIds.has(id)) { families.pageFamilies.push({ id, label:id.replace('_',' '), riskDefault:id==='tools'?'low':'medium', description:`ApprovalPrep ${id.replace('_',' ')} citation surfaces.` }); familyIds.add(id); }
}
function routeCopyFor(route){
  const title=route.title || route.path.split('/').filter(Boolean).join(' ').replace(/\b\w/g,m=>m.toUpperCase());
  const q=route.primaryQuery || title.toLowerCase();
  const fam=String(route.family||'document prep').replace(/_/g,' ');
  return {
    heading:title,
    lead:`Use this ApprovalPrep page to prepare ${q} with truthful facts, supporting documents, and a clear next step before you send anything yourself.`,
    shortAnswer:`${title} is a self-service preparation page. It helps you organize what happened, what proof supports it, what to avoid saying, and which ApprovalPrep kit or free tool may help next. It does not create documents for you, contact reviewers, or guarantee any approval outcome.`,
    primaryCta:'Start free for $0', secondaryCta:'Compare paid kits',
    decisionContext:[`Use this page when the reviewer, application, lender, landlord, employer, or funding contact is asking for clarity around ${q}.`,'The best use of this page is to separate facts from assumptions, then match each important fact to a document, date, amount, name, address, or other support you actually have.','This is not a place to invent a better story. It is a place to make the truthful packet easier to read and easier to review.'],
    whoFor:[`People preparing their own ${fam} paperwork and wanting a safer structure before sending it.`,'People who have real documents but need help organizing what to include, what to leave out, and what to explain briefly.','People who want a plain-language path to the right ApprovalPrep kit, checklist, template preview, or Studio workflow.','People who need to reduce application pressure without handing off representation to ApprovalPrep.'],
    value:['Gives the page a specific job so the user does not wander through generic paperwork advice.','Connects the preparation problem to relevant products, tools, reports, templates, or supporting guides.','Keeps the self-service boundary visible so the user understands that ApprovalPrep does not act as a law firm, credit repair company, broker, lender, landlord, employer, or agency.','Creates a citation-ready answer surface for search engines and LLM systems while keeping claims conservative.'],
    whatYouGet:['A short explanation of what this paperwork situation means.','A preparation checklist for documents, facts, dates, and support.','Common mistakes to avoid before sending anything.','A review checklist for truth, completeness, copy trail, and next step.','Links back to related ApprovalPrep resources instead of leaving the user at a dead end.'],
    useCases:[`You need to prepare around ${q}.`,'You have supporting documents but need a cleaner packet structure.','You want to understand the safe public guidance before buying or downloading a paid kit.','You need a self-service checklist before using the free Letter Writing Studio.'],
    prepBrief:['Write down the exact request, question, or application issue in one sentence.','Gather only real documents you already have or can legitimately obtain.','Create a timeline with dates, names, addresses, amounts, accounts, jobs, or application details where relevant.','Mark which statements are supported by proof and which are context only.','Decide whether you need a checklist, a template preview, the free Studio, or a paid editable kit.','Keep copies of the final packet and note when and how you send it.'],
    commonMistakes:['Writing a long emotional story when a short factual explanation would be clearer.','Making unsupported claims that the attached documents do not actually prove.','Using language that sounds like legal advice, credit repair promises, approval guarantees, or threats.','Sending original documents when copies would be safer unless originals are specifically required.','Forgetting to check spelling, dates, names, amounts, and consistency across the packet.','Assuming ApprovalPrep sends, negotiates, disputes, verifies, or contacts anyone for the user.'],
    reviewChecklist:['Every factual claim is truthful and supportable.','Every attachment has a purpose and is referenced clearly.','The explanation is short enough for a reviewer to understand quickly.','No fake document, approval guarantee, or credit repair language appears.','The next step is clear: review, download, use the Studio, compare kits, or send the packet yourself.','The user has saved a copy trail before submitting anything.'],
    steps:['Clarify the paperwork request.','Gather real proof.','Draft a short factual explanation or checklist.','Review the packet against the boundary rules.','Choose the relevant ApprovalPrep next step.','Send the materials yourself only after review.'],
    faq:[{question:`Does ${title} guarantee approval?`,answer:'No. ApprovalPrep helps users prepare clearer self-service materials. It does not control reviewer decisions or promise approval.'},{question:'Will ApprovalPrep contact anyone or submit this for me?',answer:'No. ApprovalPrep does not contact landlords, lenders, employers, bureaus, agencies, or reviewers for you. You send your own materials.'},{question:'Can I use this page instead of professional advice?',answer:'This page is educational and self-service. Legal, tax, lending, court, immigration, credit, or regulated issues may require a qualified professional.'},{question:'What should I do before using a paid kit?',answer:'Gather your real documents first, confirm the facts, and use the public guidance or free Studio to decide whether a paid PDF/DOCX kit fits your situation.'}],
    trustSignals:['Self-service only','No fake document help','No approval promise','No stored letter answers','You send it yourself','Clear next step'], citationSummary:`${title}: self-service ApprovalPrep guidance for preparing ${q} with truthful facts, supporting proof, clear boundaries, and related next steps.`, targetProductSku:route.targetProductSku || 'letter-of-explanation', generatedBy:'citation_os_self_heal', generatedAt:now
  };
}
const admittedRoutes = new Set((admissions.routes||[]).map(r=>r.route));
let maxQ = 0; for (const q of queries.queries||[]) { const m=String(q.query_id).match(/atlas_q_(\d+)/); if (m) maxQ=Math.max(maxQ,Number(m[1])); }
const queryIds = new Set((queries.queries||[]).map(q=>q.query_id));
for (const route of manifest.routes.filter(r=>r.type!=='admin')) {
  if (route.path.startsWith('/reports/')) { route.primary_cta ||= 'Start free for $0'; route.secondary_cta ||= 'Compare paid kits'; route.allowed_cta_count ||= 'multiple'; route.nav ??= false; route.indexing ||= 'index'; route.conversion_role ||= 'authority'; route.search_role ||= 'rank'; route.citation_role ||= 'citation_surface'; route.source ||= 'batch8_authority_reports'; route.targetProductSku ||= 'complete-approvalprep-bundle'; }
  if (route.index && route.path !== '/') {
    const existing = generated.routes[route.path];
    if (!existing || !existing.prepBrief?.length || !existing.primaryCta) generated.routes[route.path] = routeCopyFor(route);
  }
  if (!admittedRoutes.has(route.path)) {
    const fam = route.family || 'geo_surface';
    if (!familyIds.has(fam)) { families.pageFamilies.push({id:fam,label:fam.replace(/_/g,' '),riskDefault:route.risk||'medium',description:`ApprovalPrep ${fam} surfaces.`}); familyIds.add(fam); }
    admissions.routes.push({route:route.path,family:fam,status:route.index?'ADMITTED_INDEXABLE':'ADMITTED_NOINDEX',risk:route.risk||'medium',index:!!route.index,minimum_queries:route.index?5:0,source:'citation_os_self_heal'});
    admittedRoutes.add(route.path);
  }
  if (route.index) {
    const count = (queries.queries||[]).filter(q=>q.route_owner===route.path).length;
    if (count < 5) {
      const base = route.primaryQuery || route.title || route.path; const pref=slug(route.path);
      const intents=[['definition',base],['checklist',`${base} checklist`],['how_to',`how to prepare ${base}`],['mistakes',`${base} mistakes to avoid`],['next_step',`${base} next step`]];
      const ids=[]; for (const [intent,text] of intents) { maxQ++; const qid=`atlas_q_${String(maxQ).padStart(4,'0')}_${pref}_${intent}`; ids.push(qid); queryIds.add(qid); queries.queries.push({query_id:qid,query_text:text,query_normalized:text.toLowerCase(),source_platform:'owned_query_atlas',source_type:'citation_os_self_heal',intent_class:intent,funnel_stage:intent==='next_step'?'decision':'consideration',entity_ids:['approvalprep'],pillar_id:route.family||'geo_surface',cluster_id:pref,page_family_id:route.family||'geo_surface',route_owner:route.path,atom_ids:[],claim_ids:['claim_self_service_boundary','claim_no_approval_guarantee'],source_ids:['approvalprep_owner_policy'],risk_level:route.risk||'medium',privacy_class:'public_query',allowed_use:'query_language_and_content_briefing',status:'ADMITTED_INDEXABLE',reviewed_by:'citation_os_self_heal',reviewed_at:now.slice(0,10)}); }
      fanout.parent_queries.push({parent_id:ids[0],route_owner:route.path,page_family_id:route.family||'geo_surface',children:ids.slice(1),child_count:4,unique_intents:intents.slice(1).map(x=>x[0]),status:'admitted_unique_intent_fanout',source:'citation_os_self_heal'});
    }
  }
}
matrix.rows=(queries.queries||[]).map(q=>({query_id:q.query_id,route_owner:q.route_owner,intent_class:q.intent_class,risk_level:q.risk_level,status:q.status,source_type:q.source_type}));
const existingAtomIds = new Set((atoms.atoms||[]).map(a=>a.atom_id));
const existingAtomRouteType = new Set((atoms.atoms||[]).map(a=>`${a.route_owner}|${a.atom_type}`));
for (const [route,copy] of Object.entries(generated.routes||{})) {
  for (const [type,text] of [['short_answer',copy.shortAnswer],['checklist',(copy.prepBrief||[]).slice(0,4).join('; ')]]) {
    if (!text || existingAtomRouteType.has(`${route}|${type}`)) continue;
    let id=`atom_${slug(route)}_${type}`; let n=2; while(existingAtomIds.has(id)) id=`atom_${slug(route)}_${type}_${n++}`;
    atoms.atoms.push({atom_id:id,atom_type:type,title:`${copy.heading||route} ${type}`.slice(0,140),text,route_owner:route,uniqueness_key:`${slug(route)}-${type}-self-heal`,reuse_policy:'route scoped citation reuse',source_basis:'approvalprep_owner_policy',claim_ids:['claim_self_service_boundary','claim_no_approval_guarantee'],allowed_page_families:['brand_home','pricing','letter_studio','credit_self_service','credit','apartment_rental','rental','income_employment','auto','business','business_funding','mortgage','loan_prep','life_admin','moving','geo_surface','legal_trust','complete_bundle','checkout','download','tools','templates','public_reports'],forbidden_contexts:['guaranteed_approval','credit_repair_service_claim','fake_documents'],last_reviewed_at:now.slice(0,10)});
    existingAtomIds.add(id); existingAtomRouteType.add(`${route}|${type}`); usage.usage.push({atom_id:id,routes:[route,'/llms-full.txt']}); sourceMap.mappings.push({atom_id:id,claim_ids:['claim_self_service_boundary','claim_no_approval_guarantee'],source_ids:['approvalprep_owner_policy']});
  }
}
const usageIds = new Set((usage.usage||[]).map(u=>u.atom_id)); const sourceIds = new Set((sourceMap.mappings||[]).map(m=>m.atom_id));
for (const a of atoms.atoms||[]) { if (!usageIds.has(a.atom_id)) usage.usage.push({atom_id:a.atom_id,routes:[a.route_owner,'/llms-full.txt']}); if (!sourceIds.has(a.atom_id)) sourceMap.mappings.push({atom_id:a.atom_id,claim_ids:a.claim_ids||['claim_self_service_boundary'],source_ids:['approvalprep_owner_policy']}); }
for (const t of targets.targets||[]) { t.route ||= String(t.url||'').replace('https://approvalprep.com','') || t.path || '/'; t.query ||= t.title || 'ApprovalPrep citation target'; t.telemetry_required_for_win_claim = true; }
write('data/routes/route_manifest.json',manifest); write('data/content/generated_route_copy.json',generated); write('data/atlas/route_admission_manifest.json',admissions); write('data/atlas/page_family_registry.json',families); write('data/atlas/query_universe.json',queries); write('data/atlas/query_matrix.json',matrix); write('data/atlas/fanout_query_map.json',fanout); write('data/atoms/answer_atoms.json',atoms); write('data/atoms/atom_usage_map.json',usage); write('data/atoms/atom_source_map.json',sourceMap); write('data/atoms/citation_targets.json',targets);
fs.mkdirSync('data/workflow_traces',{recursive:true}); write('data/workflow_traces/citation_os_self_heal_latest.json',{schemaVersion:'1.0.0',generatedAt:now,status:'SELF_HEALED_CITATION_OS_CONSISTENCY'});
console.log('[content:self-heal-citation-os] OK');
