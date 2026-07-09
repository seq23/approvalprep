#!/usr/bin/env node
import { readJson, writeJson, now } from '../lib/safe-harbor-utils.mjs';
const claimsRegistry = readJson('data/citations/claim_registry.json', { claims: [] });
const unsupported = [];
for (const claim of claimsRegistry.claims || []) {
  const requiresCitation = claim.citation_mode === 'required' || ['regulated','high'].includes(claim.risk_class || claim.risk || '');
  const sourceIds = claim.source_ids || claim.sourceIds || [];
  if (requiresCitation && sourceIds.length === 0) {
    unsupported.push({
      claimId: claim.claim_id || claim.id,
      claimText: claim.claim_text || claim.text || '',
      riskClass: claim.risk_class || claim.risk || 'unknown',
      pageRoute: claim.page_route || claim.route || null,
      status: 'blocks_regulated_autopublish',
      reason: 'required_claim_has_no_source_ids'
    });
  }
}
writeJson('data/citations/unsupported_claims.json', { schemaVersion: '1.0.0', generatedAt: now(), claims: unsupported });
console.log(`[citations:unsupported-claims] claims=${unsupported.length}`);
