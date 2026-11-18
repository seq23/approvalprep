#!/usr/bin/env node
// Brand social posts (Instagram @approvalprep via the brands Buffer). Fails if:
// 1. no carousel can be made from the pin copy, or one is not cover -> 2 checklist slides
//    -> (letter) -> Letter Studio close, or prints a price;
// 2. a credit carousel misses the self-help line on any slide or in its caption (R-ADV-13);
// 3. a hashtag set breaks the mix (2 broad, 3+ mid at 100k-2M posts), lacks a count or date,
//    or any post carries a banned credit-repair tag (R-ADV-13);
// 4. the Buffer queue rule lets a channel pass per_channel_queue_max or the organisation
//    pass its scheduled-post limit, re-posts a post, or passes the week's count;
// 5. switched off, the job does anything but print OUTPUT ... OFF; switched on with no
//    token, it is anything but the named stop BUFFER_TOKEN_MISSING;
// 6. the music generator gives silence or a different track for the same week.
// Run by validate:all (registered HARD_FAIL in _repo_validation_registry.json).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planWeek, postInput } from '../brand_social/buffer_queue.mjs';
import { CREDIT_LINE, carouselFor, carouselSlugs, hashtagsFresh, postText, roomInQueue, videoFor } from '../brand_social/posts.mjs';
import { synth } from '../brand_social/music.mjs';

const plan = JSON.parse(fs.readFileSync('data/brand-social/plan.json', 'utf8'));
const tags = JSON.parse(fs.readFileSync('data/brand-social/hashtags.json', 'utf8'));
const fails = [];
const check = (name, fn) => { try { fn(); } catch (e) { fails.push(`${name}: ${e.message.split('\n')[0]}`); } };

const slugs = carouselSlugs();
const carousels = slugs.map((s) => carouselFor(s, tags)).filter(Boolean);
check('carousels exist', () => assert.ok(carousels.length >= 10, `only ${carousels.length}`));
for (const c of carousels) {
  check(`${c.id} shape`, () => {
    const kinds = c.slides.map((s) => s.kind);
    assert.equal(kinds[0], 'cover'); assert.equal(kinds.at(-1), 'close');
    assert.deepEqual(kinds.filter((k) => k === 'list').length, 2);
    assert.match(c.slides.at(-1).primary, /^Draft free in the Letter Studio/);
    assert.equal((JSON.stringify(c).match(/\$\d/g) ?? []).length, 0, 'prints a price');
  });
  if (c.credit) check(`${c.id} credit line`, () => { for (const s of c.slides) assert.equal(s.credit, CREDIT_LINE); assert.ok(c.caption.includes(CREDIT_LINE)); });
  check(`${c.id} tags`, () => {
    const text = postText(c, 'instagram').toLowerCase();
    for (const b of tags.banned) assert.ok(!text.includes(b.toLowerCase()), `banned ${b}`);
    assert.ok(c.hashtags.length >= 5);
  });
}
check('credit carousels exist', () => assert.ok(carousels.some((c) => c.credit)));
for (const [name, set] of Object.entries(tags.sets)) check(`hashtag set ${name}`, () => {
  assert.equal(set.filter((t) => t.tier === 'broad').length, 2);
  const mid = set.filter((t) => t.tier === 'mid');
  assert.ok(mid.length >= 3);
  for (const t of mid) assert.ok(t.posts >= 100_000 && t.posts <= 2_000_000, `${t.tag} ${t.posts}`);
  for (const t of set) { assert.match(t.tag, /^#[a-z0-9]+$/); assert.match(t.as_of, /^\d{4}-\d\d-\d\d$/); assert.ok(Number.isFinite(t.posts)); }
});
check('hashtags expire monthly', () => {
  assert.equal(hashtagsFresh(tags, tags.read_on), true);
  assert.equal(hashtagsFresh(tags, new Date(Date.parse(tags.refresh_by) + 86_400_000)), false);
});
check('queue limits', () => {
  assert.equal(roomInQueue({ channelScheduled: 0, orgScheduled: 9, perChannelMax: 3, orgLimit: 10 }), 1);
  assert.equal(roomInQueue({ channelScheduled: 3, orgScheduled: 3, perChannelMax: 3, orgLimit: 10 }), 0);
  const video = videoFor(5, tags);
  const state = { orgLimit: 10, orgScheduled: 0, channels: { instagram: { scheduled: 0 } } };
  const picks = planWeek({ plan, carousels, video, ledger: { posts: { [carousels[0].id]: { instagram: { week: 4 } } } }, week: 5, state, roomInQueue });
  assert.equal(picks.instagram.length, plan.posts_per_week);
  assert.equal(picks.instagram[0].id, video.id);
  assert.ok(!picks.instagram.some((p) => p.id === carousels[0].id), 're-posts');
  const input = postInput(carousels[0], 'instagram', 'ch', (p, f) => `https://approvalprep.com/social/${p.id}/${f}`, postText(carousels[0], 'instagram'));
  assert.equal(input.metadata.instagram.type, 'carousel');
  assert.equal(input.mode, 'addToQueue');
  const reel = postInput(video, 'instagram', 'ch', (p, f) => `https://approvalprep.com/social/${p.id}/${f}`, postText(video, 'instagram'));
  assert.deepEqual(Object.keys(reel.assets[0].video), ['url'], 'Buffer refuses thumbnailUrl (18 Nov 2026 live run)');
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-'));
const run = (enabled) => {
  const file = path.join(dir, `plan-${enabled}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...plan, enabled }));
  try { return { out: execFileSync('node', ['scripts/brand_social/queue_posts.mjs', '--queue'], { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, BRAND_SOCIAL_PLAN: file, BUFFER_BRANDS_ACCESS_TOKEN: '' } }), code: 0 }; } catch (e) { return { out: String(e.stdout) + String(e.stderr), code: e.status }; }
};
check('off says OFF', () => { const r = run(false); assert.equal(r.code, 0); assert.match(r.out, /^OUTPUT brand-social queue \(ApprovalPrep\): OFF/); });
check('the real entrypoint loads and names the week', () => {
  const file = path.join(dir, 'plan-dry.json');
  fs.writeFileSync(file, JSON.stringify({ ...plan, enabled: true }));
  const out = execFileSync('node', ['scripts/brand_social/queue_posts.mjs', '--render'], { encoding: 'utf8', env: { ...process.env, BRAND_SOCIAL_PLAN: file, BRAND_SOCIAL_DRY_RUN: '1' } });
  assert.match(out, /^OUTPUT brand-social render \(ApprovalPrep\): dry run - would draw ap-studio-video-w\d+, ap-/);
});
check('on without a token is a named stop', () => { const r = run(true); assert.equal(r.code, 1); assert.match(r.out, /NAMED STOP: BUFFER_TOKEN_MISSING/); });
check('music', () => {
  const [a] = synth({ preset: 'approvalprep', seconds: 3, week: 0 });
  const [b] = synth({ preset: 'approvalprep', seconds: 3, week: 0 });
  assert.ok(Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) > 0.01, 'silent');
  assert.deepEqual(Array.from(a.slice(0, 1000)), Array.from(b.slice(0, 1000)));
});

if (fails.length) { for (const f of fails) console.error(`[brand-social] FAIL ${f}`); process.exit(1); }
console.log(`[brand-social] PASS ${carousels.length} carousels, ${Object.keys(tags.sets).length} hashtag sets, queue limits, OFF switch, music`);
