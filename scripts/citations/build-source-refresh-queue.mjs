#!/usr/bin/env node
import { readJson, writeJson, now } from '../lib/safe-harbor-utils.mjs';

const registry = readJson('data/citations/source_registry.json', { sources: [] });
const maxAgeDaysByFreshness = { evergreen: 730, periodic: 365, active: 180, volatile: 90 };
const today = new Date();
const items = [];
for (const source of registry.sources || []) {
  const reviewed = source.last_reviewed_at || source.checkedAt || source.lastCheckedAt || null;
  const freshness = source.freshness_class || source.freshnessClass || 'periodic';
  const maxAge = maxAgeDaysByFreshness[freshness] || 365;
  let ageDays = null;
  let status = 'monitor';
  if (!reviewed) {
    status = 'needs_review';
  } else {
    const reviewedDate = new Date(reviewed);
    if (!Number.isNaN(reviewedDate.getTime())) {
      ageDays = Math.floor((today - reviewedDate) / 86400000);
      if (ageDays > maxAge) status = 'needs_refresh';
    } else {
      status = 'needs_review';
    }
  }
  if (status !== 'monitor') {
    items.push({
      sourceId: source.source_id || source.id,
      sourceName: source.source_name || source.name || null,
      url: source.url || null,
      freshnessClass: freshness,
      lastReviewedAt: reviewed,
      ageDays,
      status,
      action: 'review_source_manually',
      reason: status === 'needs_refresh' ? 'source_review_is_stale' : 'missing_or_invalid_review_date'
    });
  }
}
writeJson('data/citations/source_refresh_queue.json', { schemaVersion: '1.0.0', generatedAt: now(), items });
console.log(`[citations:source-refresh] items=${items.length}`);
