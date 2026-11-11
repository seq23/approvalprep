// Read-only pre-submission check. Does not create a purchase or print the identity.
const origin = process.env.AP_BUNDLE_LOAD_ORIGIN;
const token = process.env.AP_BUNDLE_LOAD_TOKEN;
if (!origin || !token) throw Error('NAMED STOP [BUNDLE_LOAD_SETUP_MISSING] Set the preview origin and inject a verified anonymous identity.');
const base = new URL(origin);
if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || !['approvalprep.com', 'approvalprep.pages.dev'].includes(base.hostname) && !base.hostname.endsWith('.approvalprep.pages.dev')) throw Error('NAMED STOP [BUNDLE_LOAD_ORIGIN_REFUSED]');
let next = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (next++ < 100) {
    const restore = await fetch(`${base.origin}/api/app-bundle`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!restore.ok) throw Error('NAMED STOP [BUNDLE_LOAD_FAILED] Restore refused or failed.');
    const { archiveUrl, kits } = await restore.json();
    const url = new URL(archiveUrl);
    if (url.origin !== base.origin || url.pathname !== '/api/app-bundle-file' || !Array.isArray(kits) || kits.length !== 2) throw Error('NAMED STOP [BUNDLE_LOAD_FAILED] Invalid Restore response.');
    const file = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!file.ok || !file.headers.get('content-type')?.startsWith('application/zip')) throw Error('NAMED STOP [BUNDLE_LOAD_FAILED] Download refused or failed.');
    let bytes = 0;
    for await (const chunk of file.body) bytes += chunk.byteLength;
    if (bytes < 4) throw Error('NAMED STOP [BUNDLE_LOAD_FAILED] Empty archive.');
  }
}));
console.log('OUTPUT 100 verified Restores and 100 nonempty bundle downloads passed.');
