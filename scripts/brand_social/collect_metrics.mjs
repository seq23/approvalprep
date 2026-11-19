#!/usr/bin/env node
// Daily: writes data/brand-social/metrics.json, the file the Boss OS Monday scorecard reads
// for the `ap-brand-social` row (boss-os src/shared/boss/scorecard/manifest.json):
//   posts_published_28d  posts the brands Buffer sent on Instagram @approvalprep in 28 days
//   social_visits_28d    page views on approvalprep.com that arrived from Instagram or
//                        TikTok in 28 days: D1 conversion_events page_view rows whose stored
//                        path carries utm_source=instagram|tiktok (the tracker keeps the
//                        query string; functions/api/track-event.js), i.e. the bio link
//                        and any UTM link in a post
//   threads_visits_28d   page views that arrived on the Threads link (utm_source=threads)
//   threads_sales_28d    paid checkouts seen in a session that arrived on the Threads link
//   updatedAt            ISO time; the scorecard refuses a file older than 9 days
// A number that cannot be read is ABSENT with a reason under `unread`, never a 0. A missing
// Buffer token is a note (green); a refused token or an unreadable D1 is a NAMED STOP and a
// red run. One OUTPUT line either way.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOKEN_ENV, bufferClient } from './buffer_queue.mjs';

const OUT = 'data/brand-social/metrics.json';
const DB = 'approvalprep-products';
const DAYS = 28;
const now = process.env.BRAND_SOCIAL_NOW ? new Date(process.env.BRAND_SOCIAL_NOW) : new Date();
const since = new Date(now.getTime() - DAYS * 86_400_000).toISOString();
const plan = JSON.parse(fs.readFileSync('data/brand-social/plan.json', 'utf8'));
const doc = { updatedAt: now.toISOString(), window: { days: DAYS, from: since, to: now.toISOString() }, by_platform: { visits: {} }, unread: {}, unread_kind: {}, sources: {
  posts: 'api.buffer.com/graphql posts(status: sent), counted on sentAt, the plan.json channels',
  visits: 'D1 conversion_events page_view rows with utm_source=instagram or tiktok in the stored path'
} };
const stops = [];

export function countSent(edges, channelIds, sinceIso) {
  return edges.map((e) => e.node).filter((p) => channelIds.includes(p.channelId) && p.sentAt && p.sentAt >= sinceIso).length;
}

async function posts() {
  const token = process.env[TOKEN_ENV];
  if (!token) { doc.unread.posts_published_28d = `${TOKEN_ENV} is not set`; doc.unread_kind.posts_published_28d = 'missing_key'; return; }
  try {
    const call = bufferClient(token);
    const org = (await call('{ account { organizations { id } } }')).account.organizations[0].id;
    const { channels } = await call('query($o:OrganizationId!){ channels(input:{organizationId:$o}){ id service name } }', { o: org });
    const ids = Object.values(plan.channels).map((w) => channels.find((c) => c.service === w.service && c.name === w.name)?.id).filter(Boolean);
    if (ids.length !== Object.keys(plan.channels).length) throw new Error('a plan channel is not in the brands Buffer');
    const { posts: p } = await call('query($o:OrganizationId!,$c:[ChannelId!]){ posts(input:{organizationId:$o, filter:{status:[sent], channelIds:$c}}){ edges { node { channelId sentAt } } } }', { o: org, c: ids });
    doc.posts_published_28d = countSent(p.edges ?? [], ids, since);
  } catch (e) {
    doc.unread.posts_published_28d = e.message; doc.unread_kind.posts_published_28d = 'broken'; stops.push(`BRAND_SOCIAL_POSTS_UNREAD - ${e.message}`);
  }
}

function d1(sql) {
  const r = spawnSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', sql], { encoding: 'utf8', env: process.env, timeout: 120000 });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'wrangler failed').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300));
  const parsed = JSON.parse(r.stdout);
  return (Array.isArray(parsed) ? parsed[0] : parsed).results || [];
}

function visits() {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    doc.unread.social_visits_28d = 'CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID are not set'; doc.unread_kind.social_visits_28d = 'broken'; stops.push('BRAND_SOCIAL_VISITS_UNREAD - no Cloudflare credentials'); return;
  }
  try {
    const all = Number(d1(`SELECT COUNT(*) AS n FROM conversion_events WHERE event = 'page_view' AND created_at >= '${since}'`)[0]?.n ?? 0);
    if (!all) { doc.unread.social_visits_28d = `no page_view rows since ${since}: the tracker is not recording`; doc.unread_kind.social_visits_28d = 'broken'; stops.push('BRAND_SOCIAL_VISITS_UNREAD - tracker recorded nothing'); return; }
    let total = 0;
    for (const platform of ['instagram', 'tiktok']) {
      const n = Number(d1(`SELECT COUNT(*) AS n FROM conversion_events WHERE event = 'page_view' AND created_at >= '${since}' AND path LIKE '%utm_source=${platform}%'`)[0]?.n ?? 0);
      doc.by_platform.visits[platform] = n; total += n;
    }
    doc.social_visits_28d = total;
    doc.all_pageviews_28d = all;
    // Threads @approvalprep (scripts/threads/threads_loop.mjs) for the Boss OS `ap-threads` row:
    // visits on the tagged link, and paid checkouts seen in a session that arrived on it.
    doc.threads_visits_28d = Number(d1(`SELECT COUNT(*) AS n FROM conversion_events WHERE event = 'page_view' AND created_at >= '${since}' AND path LIKE '%utm_source=threads%'`)[0]?.n ?? 0);
    doc.threads_sales_28d = Number(d1(`SELECT COUNT(DISTINCT session_id_hash) AS n FROM conversion_events WHERE event = 'checkout_success_seen' AND created_at >= '${since}' AND session_id_hash IN (SELECT session_id_hash FROM conversion_events WHERE event = 'page_view' AND path LIKE '%utm_source=threads%' AND session_id_hash IS NOT NULL)`)[0]?.n ?? 0);
  } catch (e) {
    doc.unread.social_visits_28d = `D1 read failed: ${e.message}`; doc.unread_kind.social_visits_28d = 'broken'; stops.push(`BRAND_SOCIAL_VISITS_UNREAD - ${e.message}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/brand_social/collect_metrics.mjs');
// --stop-check runs after the file is committed: the last good numbers stay on main and
// the run still goes red for a broken read.
if (isMain && process.argv.includes('--stop-check')) {
  const last = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  for (const s of last.stops ?? []) console.error(`NAMED STOP: ${s}`);
  process.exit(last.stops?.length ? 1 : 0);
}
if (isMain) {
  await posts();
  visits();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (stops.length) doc.stops = stops;
  fs.writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`OUTPUT brand-social metrics (ApprovalPrep): posts ${doc.posts_published_28d ?? 'not read'}, visits from Instagram/TikTok ${doc.social_visits_28d ?? 'not read'}, from Threads ${doc.threads_visits_28d ?? 'not read'}, Threads sales ${doc.threads_sales_28d ?? 'not read'} (28 days)`);
}
