// Rule 0 for the Android store workflow: an upload only counts when Google Play itself shows the new
// versionCode as a DRAFT release on the internal track, and on no other track.
// Usage: node scripts/play-internal-check.mjs <package> <versionCode>  (service account JSON at ./play-sa.json)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// @ts-ignore plain Node helper shared with the site's Google API scripts
import { serviceAccountAccessToken } from '../../../scripts/intelligence/_lib.mjs';

/** Returns the named stops for a Play `tracks.list` answer; [] means the build is a draft on internal only. */
export function internalDraftStops(tracks, versionCode) {
  const code = String(versionCode);
  if (!/^\d+$/.test(code)) return ['VERSION_CODE_UNKNOWN'];
  const holding = (tracks ?? []).flatMap(t => (t.releases ?? [])
    .filter(r => (r.versionCodes ?? []).map(String).includes(code))
    .map(r => ({ track: t.track, status: r.status })));
  const stops = [];
  if (!holding.some(h => h.track === 'internal')) stops.push('NOT_ON_INTERNAL_TRACK');
  if (holding.some(h => h.track === 'internal' && h.status !== 'draft')) stops.push('INTERNAL_RELEASE_NOT_DRAFT');
  if (holding.some(h => h.track !== 'internal')) stops.push('ON_ANOTHER_TRACK');
  return stops;
}

async function main([pkg, versionCode]) {
  const token = await serviceAccountAccessToken(JSON.parse(readFileSync('play-sa.json', 'utf8')),
    'https://www.googleapis.com/auth/androidpublisher');
  if (!token) throw Error('NAMED STOP [PLAY_TOKEN_REFUSED] the Play service account could not get an access token');
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/edits`;
  const call = async (method, url) => {
    const res = await fetch(url, { method, headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw Error(`NAMED STOP [PLAY_API_${res.status}] ${method} ${url.replace(base, 'edits')}`);
    return res.status === 204 ? null : res.json();
  };
  const { id } = await call('POST', base);
  try {
    const { tracks } = await call('GET', `${base}/${id}/tracks`);
    for (const t of tracks ?? []) for (const r of t.releases ?? []) console.log(`track ${t.track}: ${r.status} [${(r.versionCodes ?? []).join(',')}]`);
    const stops = internalDraftStops(tracks, versionCode);
    if (stops.length) throw Error(stops.map(s => `NAMED STOP [${s}]`).join('\n'));
    console.log(`OUTPUT play-internal: ${pkg} versionCode ${versionCode} is a draft on the internal track only`);
  } finally {
    // read-only: the edit is never committed (and expires on its own), so a failed delete never hides the real stop
    await call('DELETE', `${base}/${id}`).catch(e => console.error(e.message));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });
}
