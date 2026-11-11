import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
// @ts-ignore plain Node build hook
import { assertReleaseReady, releaseStops } from '../scripts/release-gate.mjs';
const ready = {
  env: { NODE_ENV: 'test' as const, EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY: 'appl_fixture', EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY: 'goog_fixture' },
  iosBundleId: 'org.example.letterdesk', androidPackage: 'org.example.letterdesk',
};
test('release gate refuses each unsafe build independently and accepts a configured build', () => {
  assert.deepEqual(releaseStops(ready), []);
  assert.doesNotThrow(() => assertReleaseReady(ready));
  for (const [options, stop] of [
    [{ ...ready, env: { ...ready.env, EXPO_PUBLIC_AP_PREVIEW: '1' } }, 'PREVIEW_FLAG_SET'],
    [{ ...ready, iosBundleId: 'com.approvalprep.app' }, 'BUNDLE_ID_PLACEHOLDER'],
    [{ ...ready, androidPackage: 'com.approvalprep.app' }, 'BUNDLE_ID_PLACEHOLDER'],
    [{ ...ready, iosBundleId: undefined }, 'BUNDLE_ID_PLACEHOLDER'],
    [{ ...ready, env: { ...ready.env, EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY: '' } }, 'REVENUECAT_KEY_MISSING'],
    [{ ...ready, env: { ...ready.env, EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY: 'test_fixture' } }, 'REVENUECAT_KEY_MISSING'],
  ] as const) {
    assert.deepEqual(releaseStops(options), [stop]);
    assert.throws(() => assertReleaseReady(options), new RegExp(stop));
  }
});
test('EAS hook blocks production but allows development and preview builds', () => {
  for (const profile of ['production', 'preview', 'development']) {
    const result = spawnSync(process.execPath, ['scripts/release-gate.mjs', '--if-production'], {
      env: { ...process.env, EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_AP_PREVIEW: '1' }, encoding: 'utf8',
    });
    assert.equal(result.status, profile === 'production' ? 1 : 0, result.stderr);
    if (profile === 'production') assert.match(result.stderr, /PREVIEW_FLAG_SET/);
  }
});
