// Run from the repo root (needs playwright there and Chrome installed): node apps/mobile/scripts/make-event-images.cjs
// Renders the two In-App Event images (card 1920x1080, details 1080x1920) in the ApprovalPrep brand.
const { chromium } = require('playwright');
const fs = require('fs');
const mob = require('path').join(__dirname, '..') + '/';
const out = mob + 'store/events/';
const logo = fs.readFileSync(mob + 'assets/approvalprep-logo.svg', 'utf8');
const mark = fs.readFileSync(mob + 'assets/approvalprep-mark.svg', 'utf8');
// A letter page: carbon heading bar, grey lines, one highlighter line, a stamp-like tick for each theme.
function page(kind, w) {
  const lines = Array.from({ length: 9 }, (_, i) => `<i style="width:${[92,84,88,70,90,80,86,60,74][i]}%;${i === (kind === 'tax' ? 3 : 5) ? 'background:#FFE066;height:22px' : ''}"></i>`).join('');
  const tag = kind === 'tax'
    ? `<div class="doc"><b>W-2</b><b>1099</b></div>`
    : `<div class="doc key"><svg viewBox="0 0 120 120"><circle cx="40" cy="60" r="26" fill="none" stroke="#1D1C21" stroke-width="12"/><path d="M64 60h48M96 60v20M110 60v14" stroke="#1D1C21" stroke-width="12" stroke-linecap="round"/></svg></div>`;
  return `<div class="sheet" style="width:${w}px"><div class="hd"></div>${lines}<div class="sig"></div>${tag}<div class="tick">${mark}</div></div>`;
}
const css = `html,body{margin:0;background:#F7F3EA}
.wrap{position:relative;overflow:hidden;background:#F7F3EA}
.sheet{position:absolute;background:#fff;border:3px solid #1D1C21;border-radius:10px;box-shadow:18px 18px 0 #1D1C21;padding:56px 56px 70px;box-sizing:border-box}
.sheet .hd{height:30px;width:46%;background:#1D1C21;border-radius:4px;margin-bottom:44px}
.sheet i{display:block;height:14px;background:#D9D3C6;border-radius:7px;margin:0 0 26px}
.sheet .sig{height:6px;width:34%;background:#1D1C21;margin-top:44px;border-radius:3px}
.doc{position:absolute;display:flex;gap:14px}
.doc b{font:800 34px/1 Arial Black,Arial,sans-serif;background:#FF7A3D;color:#1D1C21;border:3px solid #1D1C21;border-radius:8px;padding:14px 18px}
.doc.key svg{width:150px;height:150px;background:#FF7A3D;border:3px solid #1D1C21;border-radius:16px}
.tick svg{position:absolute;width:150px;height:150px}
.logo svg{display:block;height:auto}`;
const card = (kind) => `<!doctype html><style>${css}
.wrap{width:1920px;height:1080px}
.sheet{left:1010px;top:150px;transform:rotate(-4deg)}
.doc{right:-70px;top:-50px}.tick svg{left:-75px;bottom:-75px}
.logo{position:absolute;left:150px;top:470px}.logo svg{width:620px}</style>
<div class="wrap"><div class="logo">${logo}</div>${page(kind, 700)}</div>`;
const details = (kind) => `<!doctype html><style>${css}
.wrap{width:1080px;height:1920px}
.sheet{left:150px;top:640px;transform:rotate(-3deg)}
.doc{right:-60px;top:-50px}.tick svg{left:-70px;bottom:-70px}
.logo{position:absolute;left:150px;top:260px}.logo svg{width:600px}</style>
<div class="wrap"><div class="logo">${logo}</div>${page(kind, 780)}</div>`;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const [kind, name] of [['tax', 'tax-time'], ['rental', 'rental-season']]) {
    for (const [html, w, h, suffix] of [[card(kind), 1920, 1080, 'card-1920x1080'], [details(kind), 1080, 1920, 'details-1080x1920']]) {
      const p = await browser.newPage({ viewport: { width: w, height: h } });
      await p.setContent(html);
      await p.screenshot({ path: `${out}${name}-${suffix}.png` });
      await p.close();
    }
  }
  await browser.close();
})();
