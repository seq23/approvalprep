// Google Play listing graphics: 512 px icon, 1024 x 500 feature graphic and 1080 x 1920 phone
// screenshots (brand: design-approvalprep, approved 6 Nov 2026; risk R-ADV-13 wording).
// Screenshots are taken from the web export of the real app with sample letters loaded:
//   EXPO_PUBLIC_AP_PREVIEW=1 npx expo export --platform web --output-dir /tmp/apweb
//   (serve it with an index.html fallback, then) node scripts/make-play-assets.mjs http://localhost:8791
// Without a URL only the icon and the feature graphic are made. Needs sharp and playwright from the
// repo root's node_modules, and Chrome installed.
import sharp from 'sharp';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = here('../store/google-play/');
mkdirSync(`${out}screenshots`, { recursive: true });

await sharp(here('../assets/icon.png')).resize(512, 512).png().toFile(`${out}icon-512.png`);

const font = (pkg, file) => `data:font/ttf;base64,${readFileSync(here(`../node_modules/@expo-google-fonts/${pkg}/${file}`)).toString('base64')}`;
const logo = readFileSync(here('../assets/approvalprep-logo.svg'), 'utf8');
const feature = `<!doctype html><style>
@font-face{font-family:Archivo;font-weight:800;src:url(${font('archivo', '800ExtraBold/Archivo_800ExtraBold.ttf')})}
@font-face{font-family:Atkinson;font-weight:400;src:url(${font('atkinson-hyperlegible-next', '400Regular/AtkinsonHyperlegibleNext_400Regular.ttf')})}
@font-face{font-family:Plex;font-weight:500;src:url(${font('ibm-plex-mono', '500Medium/IBMPlexMono_500Medium.ttf')})}
html,body{margin:0;width:1024px;height:500px;background:#F7F3EA;color:#1D1C21}
main{box-sizing:border-box;height:500px;padding:64px 72px;display:flex;flex-direction:column;justify-content:center;gap:26px}
.logo svg{width:520px;height:auto;display:block}
h1{font:800 56px/1.08 Archivo;margin:0;letter-spacing:-.01em}
p{font:400 26px/1.35 Atkinson;margin:0}
small{font:500 16px/1.4 Plex;color:#1D1C21;opacity:.75;letter-spacing:.02em}
</style><main><div class="logo">${logo}</div>
<h1>Dispute it yourself.<br>Skip the monthly fee.</h1>
<p>Self-help letter templates you fill in, print and mail.</p>
<small>Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.</small></main>`;

const browser = await chromium.launch({ channel: 'chrome' });
const art = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await art.setContent(feature);
await art.evaluate(() => document.fonts.ready);
await art.screenshot({ path: `${out}feature-graphic.png` });

const base = process.argv[2];
if (base) {
  // 360 x 640 at 3x = 1080 x 1920, the size Google lists for phone screenshots.
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  const settle = () => page.waitForTimeout(2000);
  await page.goto(base); await settle();
  await page.getByText('Preview only: load sample letters and kits ›').click(); await settle();
  await page.evaluate(() => window.scrollTo(0, 0));
  const shots = [['1-home', '/'], ['2-write-a-letter', '/letters'], ['3-letter-studio', '/letters/studio'], ['4-my-letters', '/mine'], ['5-more', '/more']];
  for (const [name, path] of shots) {
    await page.goto(base + path); await settle();
    await page.screenshot({ path: `${out}screenshots/${name}.png` });
  }
}
await browser.close();
console.log(`OUTPUT play assets written to ${out}${base ? ' (with screenshots)' : ''}`);
