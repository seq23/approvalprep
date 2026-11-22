// In-App Event and featuring drafts (launch kit, 21 Nov 2026): Apple's limits, real dates, built content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import drafts from '../store/events/in-app-events.json';
import { situations } from '../src/studio';

const dir = path.join(__dirname, '../store/events');
const day = 86_400_000;
const pngSize = (file: string) => { const b = fs.readFileSync(path.join(dir, file)); assert.equal(b.toString('ascii', 1, 4), 'PNG', file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('each event fits Apple limits and runs at most 31 days, promoted at most 14 days ahead', () => {
  assert.ok(drafts.events.length >= 1);
  for (const e of drafts.events) {
    assert.ok(e.reference_name.length <= 64 && e.event_name.length <= 30 && e.short_description.length <= 50 && e.long_description.length <= 120, e.event_name);
    const [promote, start, end] = [e.promote_from, e.starts, e.ends].map(d => Date.parse(`${d}T00:00:00Z`));
    assert.ok(promote <= start && start - promote <= 14 * day, `${e.event_name} promotion window`);
    assert.ok(start < end && end - start <= 31 * day, `${e.event_name} length`);
  }
});

test('each event opens a free Studio situation that exists', () => {
  for (const e of drafts.events) assert.ok(situations.some(s => s.id === e.studio_situation), e.studio_situation);
});

test('the event images exist at the sizes Apple asks for', () => {
  for (const e of drafts.events) {
    assert.deepEqual(pngSize(e.card_image), [1920, 1080]);
    assert.deepEqual(pngSize(e.details_image), [1080, 1920]);
  }
});

test('the listings name the Studio\'s real number of free situations', () => {
  for (const f of ['../store/en.md', '../store/google-play/full-description.txt']) {
    const n = fs.readFileSync(path.join(__dirname, f), 'utf8').match(/any of (\d+) situations/)?.[1];
    assert.equal(Number(n), situations.length, f);
  }
});

import { seasonalTip } from '../src/seasonal';
import { studioEntry } from '../src/studioDrafts';

test('each event link opens its own situation at the first question, on a draft id', async () => {
  for (const e of drafts.events) {
    const url = new URL(e.deep_link.replace('approvalprep://', 'https://x/'));
    assert.equal(url.pathname, '/letters/studio');
    const situation = url.searchParams.get('situation')!;
    assert.equal(situation, e.studio_situation);
    const fresh = await studioEntry(null, situation);
    assert.equal(fresh.params.situation, situation);
    assert.equal(fresh.params.step, '0');
    assert.match(fresh.params.id, /^studio-/);
    const draft = { id: 'studio-old', kind: `studio-${situation}`, answers: {}, status: 'draft' as const, sentDate: null, method: null, trackingNumber: null, reminderDate: null, answerNote: '' };
    const resumed = await studioEntry({ list: async () => [draft] }, situation);
    assert.deepEqual(resumed.params, { situation, id: 'studio-old', step: '0', resumed: '1' });
  }
});

test('each event\'s seasonal tip shows in the app only during the event, on its own situation', () => {
  for (const e of drafts.events) {
    const at = (iso: string, time: string) => new Date(`${iso}T${time}`);
    assert.equal(seasonalTip(e.studio_situation, at(e.starts, '00:00:01')), e.in_app_tip);
    assert.equal(seasonalTip(e.studio_situation, at(e.ends, '23:59:00')), e.in_app_tip);
    assert.equal(seasonalTip(e.studio_situation, new Date(at(e.starts, '00:00:00').getTime() - 1)), null);
    assert.equal(seasonalTip(e.studio_situation, new Date(at(e.ends, '23:59:59').getTime() + 1000)), null);
    assert.equal(seasonalTip('general', at(e.starts, '12:00:00')), null);
  }
});
