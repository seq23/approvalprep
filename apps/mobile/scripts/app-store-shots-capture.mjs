// ApprovalPrep App Store screens from the app's web preview (same React Native code as the iOS build),
// 392x720 CSS at 3x = 1176x2160, the screen area of the store frame.  node scripts/app-store-shots-capture.mjs https://approvalprep-app-preview.pages.dev <out dir>
import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 392, height: 720 }, deviceScaleFactor: 3 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const vis = (re) => p.getByText(re).filter({ visible: true }).first();
const next = async () => { await vis(/^Next question ›$/).click(); await p.waitForTimeout(700); };
const field = () => p.locator('input, textarea').filter({ visible: true });
const shot = async (n) => { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/screen-${n}.png` }); console.log('captured', n); };
await p.goto(url + '/letters/bureau-dispute', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
await next();                       // 1 who is sending: blanks print in brackets
await next();                       // 2 find your file (optional)
await vis(/^Equifax$/).click(); await p.waitForTimeout(500);
await shot(1);                      // 3 which bureau, Equifax chosen
await next();
await field().first().fill('Credit card ending in 4821'); await next();
await field().first().fill('Reported 30 days late in March 2026'); await next();
await field().first().fill('The March payment was made on time, on March 2, 2026. My bank statement shows it.'); await next();
await vis(/^Read my draft ›$/).click(); await p.waitForTimeout(1500);
await shot(2);
// A fresh phone for My letters: only the sample letters, none of the draft written above.
const q = await (await b.newContext({ viewport: { width: 392, height: 720 }, deviceScaleFactor: 3 })).newPage();
await q.goto(url, { waitUntil: 'networkidle' }); await q.waitForTimeout(1500);
await q.getByText(/^Preview only: load sample letters and kits ›$/).filter({ visible: true }).first().click(); await q.waitForTimeout(1500);
await q.goto(url + '/mine', { waitUntil: 'networkidle' }); await q.waitForTimeout(2300);
await q.screenshot({ path: `${out}/screen-3.png` }); console.log('captured', 3);
console.log('page errors', errs.length ? errs : 'none');
await b.close();
