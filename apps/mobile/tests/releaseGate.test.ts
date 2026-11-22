import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
// @ts-ignore plain Node build hook
import { assertReleaseReady, releaseStops } from '../scripts/release-gate.mjs';
const ready = {
  env: { NODE_ENV: 'test' as const, EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY: 'appl_fixture', EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY: 'goog_fixture' },
  iosBundleId: 'com.approvalprep.app', androidPackage: 'com.approvalprep.app',
  scorecard: { bossOsRowId: 'fixture-row', recordedAt: '2026-11-20' } as { bossOsRowId?: string; recordedAt?: string | null } | null,
  kitSource: 'export const KIT_SALES_ENABLED: boolean = true;' as string,
};
test('release gate refuses each unsafe build independently and accepts a configured build', () => {
  assert.deepEqual(releaseStops(ready), []);
  assert.doesNotThrow(() => assertReleaseReady(ready));
  for (const [options, stop] of [
    [{ ...ready, env: { ...ready.env, EXPO_PUBLIC_AP_PREVIEW: '1' } }, 'PREVIEW_FLAG_SET'],
    [{ ...ready, iosBundleId: 'com.example.app' }, 'BUNDLE_ID_PLACEHOLDER'],
    [{ ...ready, androidPackage: 'org.example.letterdesk' }, 'BUNDLE_ID_PLACEHOLDER'],
    [{ ...ready, iosBundleId: 'approvalprep' }, 'BUNDLE_ID_PLACEHOLDER'],
    [{ ...ready, iosBundleId: undefined }, 'BUNDLE_ID_PLACEHOLDER'],
    [{ ...ready, env: { ...ready.env, EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY: '' } }, 'REVENUECAT_KEY_MISSING'],
    [{ ...ready, scorecard: null }, 'SCORECARD_NOT_REGISTERED'],
    [{ ...ready, scorecard: { bossOsRowId: 'fixture-row', recordedAt: null } }, 'SCORECARD_NOT_REGISTERED'],
    [{ ...ready, scorecard: { recordedAt: '2026-11-20' } }, 'SCORECARD_NOT_REGISTERED'],
    [{ ...ready, env: { ...ready.env, EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY: 'test_fixture' } }, 'REVENUECAT_KEY_MISSING'],
    [{ ...ready, kitSource: 'export const KIT_SALES_ENABLED = false;' }, 'KIT_SALES_OFF'],
    [{ ...ready, kitSource: '' }, 'KIT_SALES_OFF'],
  ] as const) {
    assert.deepEqual(releaseStops(options), [stop]);
    assert.throws(() => assertReleaseReady(options), new RegExp(stop));
  }
});
test('EAS hook blocks every store profile (production, Play internal) but allows development and preview builds', () => {
  for (const profile of ['production', 'internal', 'preview', 'development']) {
    const result = spawnSync(process.execPath, ['scripts/release-gate.mjs', '--if-production'], {
      env: { ...process.env, EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_AP_PREVIEW: '1' }, encoding: 'utf8',
    });
    const store = profile === 'production' || profile === 'internal';
    assert.equal(result.status, store ? 1 : 0, result.stderr);
    if (store) assert.match(result.stderr, /PREVIEW_FLAG_SET/);
  }
});

test('an internal (Play) build with no or a wrong RevenueCat Android key is refused, and passes with a goog_ key', () => {
  const run = (android: string | undefined) => spawnSync(process.execPath, ['scripts/release-gate.mjs', '--if-production'], {
    env: { NODE_ENV: 'test', PATH: process.env.PATH, EAS_BUILD_PROFILE: 'internal', EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY: 'appl_fixture',
      ...(android === undefined ? {} : { EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY: android }) }, encoding: 'utf8',
  });
  for (const bad of [undefined, '', 'appl_fixture', 'test_fixture']) {
    const result = run(bad);
    assert.equal(result.status, 1, `key ${bad} must be refused`);
    assert.match(result.stderr, /REVENUECAT_KEY_MISSING/);
  }
  const good = run('goog_fixture');
  assert.equal(good.status, 0, good.stderr);
});

test('the committed scorecard record names the Boss OS row and stops a store build until its registration is dated', async () => {
  // @ts-ignore plain Node build hook
  const { readScorecard } = await import('../scripts/release-gate.mjs');
  const card = readScorecard();
  assert.equal(card.bossOsRowId, 'ap-phone-app');
  const { scorecard: _fixture, ...withoutFixture } = ready;
  assert.equal(releaseStops(withoutFixture).includes('SCORECARD_NOT_REGISTERED'), !/^\d{4}-\d{2}-\d{2}$/.test(card.recordedAt ?? ''));
});

test('the committed kit switch passes the KIT_SALES_OFF stop, and switching it off would fail the store build', async () => {
  // @ts-ignore plain Node build hook
  const { kitSalesOn, readKitSource } = await import('../scripts/release-gate.mjs');
  const source = readKitSource();
  assert.equal(kitSalesOn(source), true);
  assert.equal(kitSalesOn(source.replace(/KIT_SALES_ENABLED(: boolean)? = true/, 'KIT_SALES_ENABLED$1 = false')), false);
  const { scorecard: _s, kitSource: _k, ...live } = ready;
  assert.equal(releaseStops({ ...live, scorecard: ready.scorecard }).includes('KIT_SALES_OFF'), false);
});
