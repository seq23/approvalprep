// Store builds must clear every named stop; previews remain available without store accounts.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function assertPreviewOff(env = process.env) {
  if (env.EXPO_PUBLIC_AP_PREVIEW === '1') throw Error('NAMED STOP [PREVIEW_FLAG_SET] Remove the preview flag before a store build.');
}
export const readScorecard = () => { try { return JSON.parse(readFileSync(new URL('../release/scorecard.json', import.meta.url), 'utf8')); } catch { return null; } };
/** true when src/kit.ts switches buying on; a store build that cannot sell its kits is refused. */
export const kitSalesOn = (source) => /export const KIT_SALES_ENABLED(?::\s*boolean)?\s*=\s*true\s*;/.test(source ?? '');
export const readKitSource = () => { try { return readFileSync(new URL('../src/kit.ts', import.meta.url), 'utf8'); } catch { return ''; } };
export function releaseStops(options) {
  const { env = process.env, iosBundleId, androidPackage } = options;
  // Apple rejects an app whose prices cannot be paid (guideline 2.1): buying must be on in a store build.
  const kitSource = 'kitSource' in options ? options.kitSource : readKitSource();
  // Plan task 14: no store submission before the Boss OS scorecard row is registered and dated.
  const scorecard = 'scorecard' in options ? options.scorecard : readScorecard();
  const stops = [];
  if (env.EXPO_PUBLIC_AP_PREVIEW === '1') stops.push('PREVIEW_FLAG_SET');
  // A store build needs a real reverse-DNS id on both platforms; example ids are placeholders.
  const realId = (id) => typeof id === 'string' && /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/i.test(id) && !/^(com|org|net)\.example\./i.test(id);
  if (!realId(iosBundleId) || !realId(androidPackage)) stops.push('BUNDLE_ID_PLACEHOLDER');
  if (!env.EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY?.startsWith('appl_') || !env.EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY?.startsWith('goog_')) stops.push('REVENUECAT_KEY_MISSING');
  if (!kitSalesOn(kitSource)) stops.push('KIT_SALES_OFF');
  if (!scorecard?.bossOsRowId || !/^\d{4}-\d{2}-\d{2}$/.test(scorecard?.recordedAt ?? '')) stops.push('SCORECARD_NOT_REGISTERED');
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
