import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore plain Node workflow script
import { internalDraftStops } from '../scripts/play-internal-check.mjs';

test('the Play check passes only a draft of the new versionCode on the internal track, and nowhere else', () => {
  const draft = { track: 'internal', releases: [{ status: 'draft', versionCodes: ['3'] }] };
  assert.deepEqual(internalDraftStops([draft, { track: 'production', releases: [] }], 3), []);
  // Outage: a rejected or skipped upload leaves the track without the code, so the run goes red.
  assert.deepEqual(internalDraftStops([{ track: 'internal', releases: [{ status: 'draft', versionCodes: ['2'] }] }], 3), ['NOT_ON_INTERNAL_TRACK']);
  assert.deepEqual(internalDraftStops([], 3), ['NOT_ON_INTERNAL_TRACK']);
  assert.deepEqual(internalDraftStops(undefined, 3), ['NOT_ON_INTERNAL_TRACK']);
  // Nothing goes live: a completed internal release or the code on any other track is refused.
  assert.deepEqual(internalDraftStops([{ track: 'internal', releases: [{ status: 'completed', versionCodes: ['3'] }] }], 3), ['INTERNAL_RELEASE_NOT_DRAFT']);
  assert.deepEqual(internalDraftStops([draft, { track: 'production', releases: [{ status: 'draft', versionCodes: ['3'] }] }], 3), ['ON_ANOTHER_TRACK']);
  // An unread versionCode is never a pass.
  assert.deepEqual(internalDraftStops([draft], ''), ['VERSION_CODE_UNKNOWN']);
  assert.deepEqual(internalDraftStops([draft], undefined), ['VERSION_CODE_UNKNOWN']);
});
