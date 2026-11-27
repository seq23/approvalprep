// ApprovalPrep App Store shots, 1320x2868 (6.9"). One frame for all three: the caption her picks set
// (14-15 Nov 2026; screenshot 1 is her wording), the app's own colours and fonts, and the real screen
// edge to edge inside the frame. Screens come from app-store-shots-capture.mjs.   node scripts/app-store-shots-compose.mjs <screens dir> <out dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
const [dir, out] = process.argv.slice(2);
const uri = (f) => 'data:image/png;base64,' + fs.readFileSync(`${dir}/${f}`).toString('base64');
const font = (pkg, f) => 'data:font/ttf;base64,' + fs.readFileSync(new URL(`../node_modules/@expo-google-fonts/${pkg}/${f}`, import.meta.url)).toString('base64');
const shots = [
  { n: 1, head: 'Dispute credit report errors yourself. One question at a time.' },
  { n: 2, head: 'Bureau address printed on the letter.' },
  { n: 3, kicker: 'CREDIT LETTER KIT', head: 'Your answer-due date, counted for you.' },
];
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1320, height: 2868 }, deviceScaleFactor: 1 });
for (const s of shots) {
  await p.setContent(`<!doctype html><html><head><style>
    @font-face{font-family:Archivo;font-weight:800;src:url(${font('archivo', '800ExtraBold/Archivo_800ExtraBold.ttf')})}
    @font-face{font-family:Plex;font-weight:500;src:url(${font('ibm-plex-mono', '500Medium/IBMPlexMono_500Medium.ttf')})}
    html,body{margin:0;width:1320px;height:2868px;overflow:hidden;background:#F7F3EA;color:#1D1C21}
    .rule{position:absolute;left:96px;top:120px;width:112px;height:11px;background:#FF7A3D}
    .cap{position:absolute;left:96px;top:186px;width:1128px;height:500px;display:flex;flex-direction:column;justify-content:flex-start;gap:22px}
    .kicker{font:500 44px/1 Plex;letter-spacing:.08em;color:#9A3F12}
    h1{margin:0;font:800 104px/1.06 Archivo;letter-spacing:-.01em}
    .frame{position:absolute;left:69px;top:702px;width:1182px;height:2400px;box-sizing:border-box;border:3px solid #D9D0BE;border-radius:60px;background:#F7F3EA;overflow:hidden;box-shadow:0 0 60px 10px rgba(60,50,30,.07)}
    .frame img{display:block;width:1176px;height:2160px}
  </style></head><body><div class="rule"></div><div class="cap">${s.kicker ? `<div class="kicker">${s.kicker}</div>` : ''}<h1>${s.head}</h1></div>
  <div class="frame"><img src="${uri(`screen-${s.n}.png`)}"></div></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  const capH = await p.evaluate(() => { const c = document.querySelector('.cap'); return [...c.children].reduce((h, e) => h + e.getBoundingClientRect().height, 0); });
  if (capH > 500) throw Error(`CAPTION_TOO_TALL shot ${s.n}: ${capH}`);
  await p.screenshot({ path: `${out}/approvalprep-0${s.n}.png` });
}
await b.close(); console.log('OUTPUT', shots.length, 'shots');
