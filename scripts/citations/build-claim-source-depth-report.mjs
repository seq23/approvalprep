#!/usr/bin/env node
import { readJson, writeJson, now } from '../lib/safe-harbor-utils.mjs';
const claimsRegistry = readJson('data/citations/claim_registry.json', { claims: [] });
const sourceRegistry = readJson('data/citations/source_registry.json', { sources: [] });
const sourceIds = new Set((sourceRegistry.sources || []).map(s => s.source_id || s.id));
const claims = (claimsRegistry.claims || []).map(claim => {
  const ids = claim.source_ids || claim.sourceIds || [];
  const missingSourceIds = ids.filter(id => !sourceIds.has(id));
  const requiresCitation = claim.citation_mode === 'required' || ['regulated','high'].includes(claim.risk_class || claim.risk || '');
  return {
    claimId: claim.claim_id || claim.id,
    riskClass: claim.risk_class || claim.risk || 'unknown',
    citationMode: claim.citation_mode || 'optional',
    sourceCount: ids.length,
    missingSourceIds,
    status: requiresCitation && ids.length === 0 ? 'unsupported' : missingSourceIds.length ? 'source_id_missing' : 'covered'
  };
});
const summary = {
  totalClaims: claims.length,
  coveredClaims: claims.filter(c => c.status === 'covered').length,
  unsupportedClaims: claims.filter(c => c.status === 'unsupported').length,
  missingSourceIdClaims: claims.filter(c => c.status === 'source_id_missing').length
};
writeJson('data/citations/claim_source_depth_report.json', { schemaVersion: '1.0.0', generatedAt: now(), summary, claims });
console.log(`[citations:source-depth] claims=${claims.length} unsupported=${summary.unsupportedClaims}`);
