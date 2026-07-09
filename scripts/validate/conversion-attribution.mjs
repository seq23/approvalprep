#!/usr/bin/env node
import { readJson, exists, fail } from './_common.mjs';
const schema = readJson('data/metrics/conversion_events_schema.json');
const report = readJson('data/metrics/conversion_report.json');
if (!exists('functions/api/track-event.js')) fail('[conversion-attribution] missing runtime tracking endpoint');
if (!exists('src/components/AnalyticsEvent.astro')) fail('[conversion-attribution] missing analytics component');
for (const event of ['page_view','checkout_start','checkout_success_seen','download_verified']) if (!schema.allowedEvents.includes(event)) fail('[conversion-attribution] required event missing '+event);
for (const field of ['email','letterText','documentText','fullIp']) if (!schema.blockedFields.includes(field)) fail('[conversion-attribution] blocked sensitive field missing '+field);
if (report.mode !== 'static_readiness') fail('[conversion-attribution] report must not fake live conversion mode');
console.log(`[conversion-attribution] OK events=${schema.allowedEvents.length} blocked=${schema.blockedFields.length}`);
