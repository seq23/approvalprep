import { test } from 'node:test';
import assert from 'node:assert/strict';
import listing from '../store/listing.json';
import fs from 'node:fs';
import path from 'node:path';

const playFull = fs.readFileSync(path.join(__dirname, '../store/google-play/full-description.txt'), 'utf8');

test('the store listing fits Apple and Google limits', () => {
  assert.ok(listing.name.length <= 30, `name ${listing.name.length}`);
  assert.ok(listing.subtitle.length <= 30, `subtitle ${listing.subtitle.length}`);
  assert.ok(listing.keywords.length <= 100, `keywords ${listing.keywords.length}`);
  assert.ok(listing.play_short_description.length <= 80, `play short ${listing.play_short_description.length}`);
});

test('keywords: commas only, no repeats, nothing already in the name or subtitle, no competitor names', () => {
  assert.doesNotMatch(listing.keywords, /\s/);
  const words = listing.keywords.split(',');
  assert.ok(words.every(Boolean), 'no empty entry');
  assert.equal(new Set(words).size, words.length, 'no repeated word');
  const shown = new Set(`${listing.name} ${listing.subtitle}`.toLowerCase().match(/[a-z0-9]+/g));
  for (const w of words) assert.ok(!shown.has(w), `${w} is already indexed from the name or subtitle`);
  assert.doesNotMatch(listing.keywords, /lexington|saint|versio|dovly|kikoff|credit ?karma|experian|equifax|transunion|dispute ?beast/i);
  // R-ADV-13 and Apple 2.3.7 (store review 27 Nov 2026): no removal promise and nothing the app does not have
  // (there is no "609 letter"; ApprovalPrep has no collections tool).
  for (const w of words) assert.doesNotMatch(w, /^(delete|deletion|remove|removal|erase|609|collections|fix|repair)$/i, `${w} promises a result or names something the app lacks`);
});

test('the Play listing fits Google limits and carries no hashtags', () => {
  assert.ok(playFull.trim().length > 200 && playFull.length <= 4000, `play full ${playFull.length}`);
  for (const text of [playFull, listing.play_short_description]) assert.doesNotMatch(text, /#\w/, 'Play forbids hashtags (and never #creditrepair)');
});

test('Android build blocks permissions the app never uses (Play declarations stay true)', async () => {
  const { default: config } = await import('../app.config');
  const blocked = config.android?.blockedPermissions ?? [];
  for (const p of ['SYSTEM_ALERT_WINDOW', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'RECORD_AUDIO', 'CAMERA', 'ACCESS_FINE_LOCATION', 'READ_CONTACTS'])
    assert.ok(blocked.includes(`android.permission.${p}`), `${p} must be blocked`);
});

test('App Store screenshots are 6.9-inch PNGs (1320 x 2868), at least three', () => {
  const dir = path.join(__dirname, '../store/app-store');
  const shots = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
  assert.ok(shots.length >= 3, `only ${shots.length} App Store screenshots`);
  for (const f of shots) {
    const png = fs.readFileSync(path.join(dir, f));
    assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG', `${f} is not a PNG`);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1320, 2868], `${f} size`);
  }
});
