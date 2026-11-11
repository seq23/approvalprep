// Store builds must clear every named stop; previews remain available without store accounts.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function assertPreviewOff(env = process.env) {
  if (env.EXPO_PUBLIC_AP_PREVIEW === '1') throw Error('NAMED STOP [PREVIEW_FLAG_SET] Remove the preview flag before a store build.');
}
export function releaseStops({ env = process.env, iosBundleId, androidPackage }) {
  const stops = [];
  if (env.EXPO_PUBLIC_AP_PREVIEW === '1') stops.push('PREVIEW_FLAG_SET');
  if (!iosBundleId || !androidPackage || [iosBundleId, androidPackage].includes('com.approvalprep.app')) stops.push('BUNDLE_ID_PLACEHOLDER');
  if (!env.EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY?.startsWith('appl_') || !env.EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY?.startsWith('goog_')) stops.push('REVENUECAT_KEY_MISSING');
  return stops;
}
export function assertReleaseReady(options) {
  const stops = releaseStops(options);
  if (stops.length) throw Error(stops.map(code => `NAMED STOP [${code}]`).join('\n'));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes('--if-production') || process.env.EAS_BUILD_PROFILE === 'production') {
    const config = readFileSync(new URL('../app.config.ts', import.meta.url), 'utf8');
    assertReleaseReady({
      env: process.env,
      iosBundleId: /bundleIdentifier:\s*'([^']+)'/.exec(config)?.[1],
      androidPackage: /package:\s*'([^']+)'/.exec(config)?.[1],
    });
  }
}
