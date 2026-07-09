#!/usr/bin/env node
import fs from "node:fs";
const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const writeJson = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const now = new Date().toISOString();
const generatedCopy = readJson("data/content/generated_route_copy.json");
const generatedAnswers = readJson("data/content/generated_answers.json");
const atoms = readJson("data/atoms/answer_atoms.json");
const targets = readJson("data/atoms/citation_targets.json");
const sourceMap = readJson("data/atoms/atom_source_map.json");
const usageMap = readJson("data/atoms/atom_usage_map.json");
const existingAtomIds = new Set(atoms.atoms.map((atom) => atom.atom_id));
const existingTargetKeys = new Set(targets.targets.map((target) => `${target.route}|${target.query}`));
const existingMappings = new Set(sourceMap.mappings.map((item) => item.atom_id));
const existingUsage = new Set(usageMap.usage.map((item) => item.atom_id));
const addAtom = (atom) => {
  if (existingAtomIds.has(atom.atom_id)) return;
  atoms.atoms.push(atom);
  existingAtomIds.add(atom.atom_id);
  if (!existingMappings.has(atom.atom_id)) {
    sourceMap.mappings.push({ atom_id: atom.atom_id, claim_ids: atom.claim_ids || ["claim_self_service_boundary"], source_ids: ["approvalprep_owner_policy"] });
    existingMappings.add(atom.atom_id);
  }
  if (!existingUsage.has(atom.atom_id)) {
    usageMap.usage.push({ atom_id: atom.atom_id, routes: [atom.route_owner, "/blog", "/answers/index.json", "/llms-full.txt"] });
    existingUsage.add(atom.atom_id);
  }
};
for (const [route, copy] of Object.entries(generatedCopy.routes || {})) {
  const base = slug(route || copy.heading || "generated_route");
  addAtom({ atom_id: `atom_${base}_short_answer`, atom_type: "short_answer", title: `${copy.heading} short answer`, text: copy.shortAnswer, route_owner: route, uniqueness_key: `atom_${base}_short_answer-v1`, reuse_policy: "route scoped citation reuse", source_basis: "page_factory", claim_ids: ["claim_self_service_boundary"], allowed_page_families: ["letter_studio","income_employment","apartment_rental","auto","business_funding","mortgage","geo_surface"], forbidden_contexts: ["guaranteed_approval","credit_repair_service_claim","fake_documents"], last_reviewed_at: now.slice(0,10) });
  addAtom({ atom_id: `atom_${base}_document_list`, atom_type: "document_list", title: `${copy.heading} document preparation list`, text: (copy.prepBrief || []).join(" "), route_owner: route, uniqueness_key: `atom_${base}_document_list-v1`, reuse_policy: "route scoped citation reuse", source_basis: "page_factory", claim_ids: ["claim_self_service_boundary"], allowed_page_families: ["letter_studio","income_employment","apartment_rental","auto","business_funding","mortgage","geo_surface"], forbidden_contexts: ["guaranteed_approval","credit_repair_service_claim","fake_documents"], last_reviewed_at: now.slice(0,10) });
  for (const query of [copy.citationSummary, ...(copy.useCases || [])].filter(Boolean)) {
    const targetKey = `${route}|${query}`;
    if (!existingTargetKeys.has(targetKey)) {
      targets.targets.push({ query_id: `pf_${targets.targets.length + 1}`, query, route, desired_surface: "citation_ready_answer_asset", telemetry_required_for_win_claim: true });
      existingTargetKeys.add(targetKey);
    }
  }
}
for (const answer of generatedAnswers.answers.filter((item) => item.status === "published_by_contract")) {
  const base = slug(answer.id || answer.title);
  addAtom({ atom_id: `atom_blog_${base}`, atom_type: "short_answer", title: answer.title, text: answer.answer, route_owner: answer.route, uniqueness_key: `atom_blog_${base}-v1`, reuse_policy: "blog detail citation reuse", source_basis: "scheduled_content_release", claim_ids: ["claim_self_service_boundary"], allowed_page_families: ["geo_surface"], forbidden_contexts: ["guaranteed_approval","credit_repair_service_claim","fake_documents"], last_reviewed_at: now.slice(0,10) });
}
atoms.generatedAt = now;
targets.generatedAt = now;
writeJson("data/atoms/answer_atoms.json", atoms);
writeJson("data/atoms/citation_targets.json", targets);
writeJson("data/atoms/atom_source_map.json", sourceMap);
writeJson("data/atoms/atom_usage_map.json", usageMap);
console.log(`[content:generate-atoms-expanded] atoms=${atoms.atoms.length} targets=${targets.targets.length}`);
