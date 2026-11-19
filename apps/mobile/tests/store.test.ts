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
});

test('the Play listing fits Google limits and carries no hashtags', () => {
  assert.ok(playFull.trim().length > 200 && playFull.length <= 4000, `play full ${playFull.length}`);
  for (const text of [playFull, listing.play_short_description]) assert.doesNotMatch(text, /#\w/, 'Play forbids hashtags (and never #creditrepair)');
});
