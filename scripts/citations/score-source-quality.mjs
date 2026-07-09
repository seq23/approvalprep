#!/usr/bin/env node
import { readJson, writeJson, now } from '../lib/safe-harbor-utils.mjs';
const registry = readJson('data/citations/source_registry.json', { sources: [] });
const sources = (registry.sources || []).map(source => {
  const authority = source.authority_class || source.source_type || 'unknown';
  const hasUrl = Boolean(source.url);
  const hasPublisher = Boolean(source.publisher || source.source_name || source.name);
  const hasReviewDate = Boolean(source.last_reviewed_at || source.checkedAt || source.lastCheckedAt);
  let score = 0;
  if (hasUrl) score += 25;
  if (hasPublisher) score += 20;
  if (hasReviewDate) score += 20;
  if (['official','government','regulator'].includes(authority)) score += 30;
  else if (['recognized','expert','educational'].includes(authority)) score += 15;
  return {
    sourceId: source.source_id || source.id,
    url: source.url || null,
    authorityClass: authority,
    score,
    status: score >= 70 ? 'strong' : score >= 45 ? 'usable' : 'needs_review',
    checks: { hasUrl, hasPublisher, hasReviewDate }
  };
});
writeJson('data/citations/source_quality_registry.json', { schemaVersion: '1.0.0', generatedAt: now(), sources });
console.log(`[citations:source-quality] sources=${sources.length}`);
