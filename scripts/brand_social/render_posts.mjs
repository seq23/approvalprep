// Draws ApprovalPrep's brand social posts: carousel slides (1080x1350 JPEG) and the weekly
// screen-recorded Letter Studio video (1080x1920 MP4), into public/social/<post id>/.
// $0: Playwright's Chromium draws the slides from the brand fonts in
// scripts/pinterest/fonts; the video is real screenshots of the live Letter Studio taken
// while it is filled in, joined by ffmpeg. No model, no paid tool, no stock photos.
//
//   node scripts/brand_social/render_posts.mjs --ids a,b     draw these posts
//   node scripts/brand_social/render_posts.mjs --sample      draw the sample set
//
// Prints one OUTPUT line. Exits 1 with NAMED STOP BRAND_SOCIAL_RENDER_FAILED when a post
// it was asked for has no files afterwards.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { carouselFor, carouselSlugs, videoFor } from './posts.mjs';
import { concatSeconds, muxArgs, writeTrack } from './music.mjs';

const MUSIC_PRESET = 'approvalprep';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public', 'social');
const FONTS = path.join(ROOT, 'scripts', 'pinterest', 'fonts');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const font = (file) => `data:font/ttf;base64,${fs.readFileSync(path.join(FONTS, file)).toString('base64')}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// BRAND_SOCIAL_PLAN: another plan file, for tests only.
export const loadPlan = () => (process.env.BRAND_SOCIAL_PLAN ? JSON.parse(fs.readFileSync(process.env.BRAND_SOCIAL_PLAN, 'utf8')) : readJson('data/brand-social/plan.json'));
export const loadHashtags = () => readJson('data/brand-social/hashtags.json');
export const allCarousels = () => { const tags = loadHashtags(); return carouselSlugs().map((s) => carouselFor(s, tags)).filter(Boolean); };
export const weekVideo = (week) => videoFor(week, loadHashtags());

const CSS = (h) => `
@font-face{font-family:'Archivo X';src:url(${font('ArchivoSemiExpanded-ExtraBold.ttf')})}
@font-face{font-family:'Atkinson';src:url(${font('AtkinsonHyperlegible-Regular.ttf')})}
@font-face{font-family:'Atkinson';font-weight:700;src:url(${font('AtkinsonHyperlegible-Bold.ttf')})}
@font-face{font-family:'Plex Mono';src:url(${font('IBMPlexMono-Bold.ttf')})}
:root{--paper:#F7F3EA;--carbon:#1D1C21;--orange:#FF7A3D;--highlighter:#FFE066;--rule:#E3DCCB;--card:#FFFDF8}
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:${h}px;background:var(--paper);color:var(--carbon)}
.s{width:1080px;height:${h}px;padding:92px 92px 80px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:18px;font:800 44px/1 'Archivo X'}
.box{width:52px;height:52px;border-radius:10px;background:var(--orange);display:grid;place-items:center}
.box svg{width:34px;height:34px}
.hl{background:var(--highlighter);padding:0 8px}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px}
.label{font:700 26px/1.2 'Plex Mono';letter-spacing:.14em;text-transform:uppercase}
h1{font:800 104px/1.02 'Archivo X';letter-spacing:-.01em;text-wrap:balance}
.tag{font:700 44px/1.3 'Atkinson'}
ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:30px}
li{display:flex;gap:28px;align-items:flex-start;font:400 54px/1.2 'Atkinson'}
li i{flex:none;width:56px;height:56px;margin-top:4px;border:5px solid var(--carbon);border-radius:10px;display:grid;place-items:center;background:var(--card)}
li i svg{width:36px;height:36px}
.letter{background:var(--card);border:3px solid var(--rule);border-radius:18px;padding:56px;display:flex;flex-direction:column;gap:26px;font:400 40px/1.35 'Atkinson'}
.letter .re{font:700 34px/1.3 'Plex Mono'}
.btn{display:inline-block;background:var(--orange);color:var(--carbon);font:700 48px/1 'Atkinson';padding:36px 46px;border-radius:18px}
.credit{font:400 26px/1.35 'Atkinson';color:#4A4850;border-top:2px solid var(--rule);padding-top:22px}
.foot{display:flex;justify-content:space-between;align-items:center;font:700 26px/1 'Plex Mono';letter-spacing:.08em;padding-top:26px}
`;
const tick = (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>`;
const brand = `<div class="brand"><span class="box">${tick('#1D1C21')}</span><span>Approval<span class="hl">Prep</span></span></div>`;

export function slideHtml(slide, index, total, h = 1350) {
  const credit = slide.credit ? `<p class="credit">${esc(slide.credit)}</p>` : '';
  const foot = (left, right = `${index + 1} / ${total}`) => `${credit}<div class="foot"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
  let inner;
  if (slide.kind === 'cover') inner = `${brand}<div class="mid"><div class="label">${esc(slide.eyebrow)}</div><h1>${esc(slide.headline)}</h1><p class="tag">${esc(slide.tagline)}</p></div>${foot('Swipe ›')}`;
  else if (slide.kind === 'list') inner = `${brand}<div class="mid"><div class="label">${esc(slide.label)}</div><ul>${slide.items.map((x) => `<li><i>${tick('#FF7A3D')}</i><span>${esc(x)}</span></li>`).join('')}</ul></div>${foot('approvalprep.com')}`;
  else if (slide.kind === 'letter') inner = `${brand}<div class="mid"><div class="label">${esc(slide.label)}</div><div class="letter"><p class="re">${esc(slide.re)}</p><p>${esc(slide.greeting)}</p>${slide.body.map((x) => `<p>${esc(x)}</p>`).join('')}</div></div>${foot('approvalprep.com')}`;
  else inner = `${brand}<div class="mid"><h1>${esc(slide.headline)}</h1><p class="tag">No account. Nothing stored on our side.</p><div><span class="btn">${esc(slide.primary)}</span></div></div>${foot(slide.site, total > 1 ? `${index + 1} / ${total}` : 'link in bio')}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS(h)}</style></head><body><div class="s">${inner}</div></body></html>`;
}

async function drawCarousel(browser, post) {
  const dir = path.join(OUT, post.id);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  const files = [];
  for (const [i, slide] of post.slides.entries()) {
    await page.setContent(slideHtml(slide, i, post.slides.length), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(dir, `${i + 1}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
    files.push(file);
  }
  await page.close();
  return files;
}

const bandCss = `body{padding-top:74px!important}#bs-band{position:fixed;left:0;right:0;top:0;z-index:2147483647;min-height:74px;display:flex;align-items:center;justify-content:center;padding:10px 18px;background:#1D1C21;color:#F7F3EA;font:700 22px/1.15 Archivo,'Arial Black',sans-serif;text-align:center}`;
async function band(page, text) {
  await page.evaluate(({ text, css }) => {
    let el = document.getElementById('bs-band');
    if (!el) {
      const st = document.createElement('style'); st.textContent = css; document.head.append(st);
      el = document.createElement('div'); el.id = 'bs-band'; document.body.append(el);
    }
    el.textContent = text;
  }, { text, css: bandCss });
}

/** The Letter Studio, filled in live. */
async function drawVideo(browser, post) {
  const dir = path.join(OUT, post.id);
  const frames = path.join(dir, 'frames');
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3 });
  const page = await ctx.newPage();
  const list = [];
  let n = 0;
  const shot = async (seconds) => {
    const file = path.join(frames, `${String(n++).padStart(3, '0')}.png`);
    await page.screenshot({ path: file });
    list.push(`file '${file}'\nduration ${seconds}`);
  };
  const into = async (sel) => { await page.locator(sel).scrollIntoViewIfNeeded(); await page.evaluate((s) => { const el = document.querySelector(s); window.scrollBy(0, el.getBoundingClientRect().top - 200); }, sel); };
  const type = async (sel, text) => {
    await into(sel);
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += 3) { await page.locator(sel).fill(words.slice(0, i + 3).join(' ')); await shot(0.18); }
    await shot(0.5);
  };
  const s = post.script;
  await page.goto(`https://approvalprep.com${post.page}`, { waitUntil: 'networkidle' });
  await band(page, `Explaining ${s.label}? Draft the letter free`); await shot(2.2);
  await into('select[name=situation]');
  await page.selectOption('select[name=situation]', s.situation); await page.waitForTimeout(400);
  await band(page, 'Pick your situation'); await shot(1.6);
  await band(page, 'Answer in plain words');
  await type('[name=name]', 'Your Name');
  await type('[name=recipient]', s.recipient);
  await type('[name=happened]', s.happened);
  await type('[name=now]', s.now);
  await page.getByRole('button', { name: 'Write my letter' }).click(); await page.waitForTimeout(1500);
  const letterTop = await page.evaluate(() => { const el = [...document.querySelectorAll('h2,h3')].find((h) => /letter/i.test(h.textContent) && h.offsetParent && h.getBoundingClientRect().top > 0); return el ? el.getBoundingClientRect().top + window.scrollY - 90 : window.scrollY; });
  await page.evaluate((y) => window.scrollTo(0, y), letterTop); await page.waitForTimeout(300);
  await band(page, 'A first-pass letter, in proper letter form'); await shot(2.6);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 150); await page.waitForTimeout(120); await shot(0.4); }
  await ctx.close();
  const end = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const close = { kind: 'close', headline: 'Write yours in minutes.', primary: 'Draft free in the Letter Studio ›', site: 'approvalprep.com', credit: post.credit ? post.caption.split('\n').find((l) => l.startsWith('Self-help')) : undefined };
  await end.setContent(slideHtml(close, 0, 1, 1920), { waitUntil: 'load' });
  await end.evaluate(() => document.fonts.ready);
  const last = path.join(frames, `${String(n++).padStart(3, '0')}.png`);
  await end.screenshot({ path: last }); await end.close();
  list.push(`file '${last}'\nduration 3`, `file '${last}'`);
  fs.writeFileSync(path.join(frames, 'list.txt'), `${list.join('\n')}\n`);
  const mp4 = path.join(dir, 'video.mp4');
  const silent = path.join(frames, 'silent.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(frames, 'list.txt'), '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p', '-r', '30', '-c:v', 'libx264', '-crf', '23', '-an', silent]);
  // Original music under it (scripts/brand_social/music.mjs; data/brand-social/music.json).
  const seconds = concatSeconds(fs.readFileSync(path.join(frames, 'list.txt'), 'utf8')); // no ffprobe: the static ffmpeg build has none
  const wav = writeTrack(path.join(frames, 'music.wav'), { preset: MUSIC_PRESET, seconds, week: post.week ?? 0 });
  execFileSync('ffmpeg', muxArgs(silent, wav, seconds, mp4));
  const cover = path.join(dir, 'cover.jpg');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(frames, '000.png'), '-vf', 'scale=1080:1920', '-q:v', '3', cover]);
  fs.rmSync(frames, { recursive: true, force: true });
  return [mp4, cover];
}

export async function render(posts) {
  const browser = await chromium.launch();
  const made = {};
  try {
    for (const post of posts) made[post.id] = post.type === 'video' ? await drawVideo(browser, post) : await drawCarousel(browser, post);
  } finally {
    await browser.close();
  }
  return made;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const plan = loadPlan();
  const carousels = allCarousels();
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
  let posts;
  if (process.argv.includes('--sample')) posts = [...carousels.filter((c) => plan.sample.carousels.includes(c.id)), weekVideo(plan.sample.video_week)];
  else {
    const ids = new Set((arg('--ids') ?? '').split(',').filter(Boolean));
    const weeks = arg('--week') != null ? [Number(arg('--week'))] : [0, 1, 2, 3];
    posts = [...carousels, ...weeks.map((w) => weekVideo(w))].filter((p) => ids.has(p.id));
  }
  const made = await render(posts);
  const missing = posts.filter((p) => !(made[p.id] ?? []).length || !made[p.id].every((f) => fs.existsSync(f)));
  console.log(`OUTPUT brand-social render: ${posts.length - missing.length} of ${posts.length} post(s) drawn into public/social`);
  if (missing.length) { console.error(`NAMED STOP: BRAND_SOCIAL_RENDER_FAILED - ${missing.map((p) => p.id).join(', ')}`); process.exit(1); }
}
