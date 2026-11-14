// Navigation map checks (make-it-calm section 7; the owner's tap-through of the sibling
// Dream Wedding app, 6 Nov 2026: "i cant go back or back to home or esc"). Back, Close and
// the tab bar are drawn from src/screens.ts, so the map being right is the app being navigable.
import { PRODUCTS } from '../src/offers';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FIRST, HOME, SCREENS, TABS, backTarget, byRoute, screenForPath, titleFor } from '../src/screens';

const root = path.join(__dirname, '..');
const routeOfFile = (f: string) => ('/' + f.replace(/^app\//, '').replace(/\(tabs\)\//, '').replace(/(^|\/)index\.tsx$|\.tsx$/, '')).replace(/\/$/, '') || '/';
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

test('the map and the route files match both ways, and each route is the URL its file serves', () => {
  const files = walk(path.join(root, 'app')).map(f => path.relative(root, f)).filter(f => !path.basename(f).startsWith('_'));
  assert.deepEqual(files.sort(), SCREENS.map(s => s.file).sort());
  for (const s of SCREENS) assert.equal(routeOfFile(s.file), s.route, s.file);
});

test('every screen reaches Write a letter in one tap', () => {
  for (const s of SCREENS) assert.ok(s.kind === 'start' ? s.links.includes(HOME) : !!s.tab, `${s.id} ${s.route}`);
});

test('every sub-screen and sheet has Back or Close inside its own tab, so Android back never leaves the app', () => {
  for (const s of SCREENS.filter(x => x.kind === 'sub' || x.kind === 'sheet')) {
    assert.ok(s.tab && s.back, `${s.id} needs a tab and a back`);
    assert.equal(byRoute(s.back!).tab, s.tab, `${s.id} goes back out of its tab`);
    assert.ok(s.file.startsWith(`app/(tabs)/${s.tab}/`), `${s.id} must live in its tab's stack folder`);
    let p = byRoute(s.back!), hops = 0;
    while (p.back && hops++ < 10) p = byRoute(p.back);
    assert.equal(p.kind, 'tab', `${s.id}: back chain ends at ${p.route}`);
  }
  for (const t of SCREENS.filter(x => x.kind === 'tab')) assert.equal(t.back, undefined, `${t.id}: a tab root has no Back`);
  assert.equal(TABS.length <= 4, true);
});

test('no orphans: every screen is reachable from Start, and every link is a real button', () => {
  const seen = new Set(['/']), queue = ['/'];
  while (queue.length) {
    const s = byRoute(queue.shift()!);
    for (const r of [...s.links, ...(s.back ? [s.back] : []), ...(s.tab ? TABS.map(t => t.route) : [])]) if (!seen.has(r)) { byRoute(r); seen.add(r); queue.push(r); }
  }
  // The not-found page is the one screen no button leads to: it is where a wrong address lands.
  assert.deepEqual([...seen].sort(), SCREENS.filter(s => s.route !== '/+not-found').map(s => s.route).sort());
  for (const s of SCREENS) {
    const src = fs.readFileSync(path.join(root, s.file), 'utf8');
    assert.ok(src.includes(`<Screen route="${s.route}"`), `${s.file} does not draw <Screen> for ${s.route}`);
    // A screen that lists the products (src/offers.ts) opens each product's own screen from that list.
    const listsProducts = /\bPRODUCTS\.map\(|productRoute\(/.test(src);
    for (const l of s.links) assert.ok(src.includes(`'${l}'`) || src.includes(l.replace('[kind]', '${')) || (listsProducts && PRODUCTS.some(p => p.screen === l)), `${s.id}: no button goes to ${l}`);
  }
});

// Hostile review, 13 Nov 2026: the first screen had no tabs and nothing linked back to it.
test('the first screen is a tab: it shows the tab bar and every screen can reach it again', () => {
  const first = byRoute(FIRST);
  assert.equal(first.kind, 'tab');
  assert.equal(TABS[0].route, FIRST);
  assert.equal(TABS.find(t => t.route === FIRST)?.tab, first.tab);
  for (const s of SCREENS.filter(x => x.route !== FIRST)) assert.ok(s.tab || s.links.includes(FIRST), `${s.id} cannot reach the first screen`);
});

// Hostile review: a kit opened from More went "back" to Write a letter.
test('Back returns to the tab a screen was opened from, and never to an address outside the tab bar', () => {
  assert.equal(backTarget('/letters/unlock', '/more'), '/more');
  assert.equal(backTarget('/letters/bundle', '/more'), '/more');
  assert.equal(backTarget('/letters/studio', '/'), '/');
  assert.equal(backTarget('/letters/draft', '/mine'), '/mine');
  // Opened inside its own tab, or handed nonsense: the screen's parent in the map.
  assert.equal(backTarget('/letters/unlock'), '/letters');
  assert.equal(backTarget('/letters/unlock', '/letters'), '/letters');
  assert.equal(backTarget('/letters/unlock', 'https://example.com/'), '/letters');
  assert.equal(backTarget('/letters/unlock', '/letters/sent'), '/letters');
  assert.equal(backTarget('/letters/sent', ['/mine']), '/mine');
});

// Hostile review: Escape on "Mark as sent" went back two screens, because the screen under it answered too.
test('only the screen on show answers Back keys: each address belongs to exactly one screen', () => {
  assert.equal(screenForPath('/letters/sent').route, '/letters/sent');
  assert.equal(screenForPath('/letters/draft').route, '/letters/draft');
  assert.equal(screenForPath('/letters/goodwill').route, '/letters/[kind]');
  assert.equal(screenForPath('/letters/').route, '/letters');
  assert.equal(screenForPath('/').route, '/');
});

// Hostile review: a wrong address showed the developer page "Unmatched Route ... Sitemap".
test('an unknown address is the plain not-found page, with a way to the first screen and to Write a letter', () => {
  for (const wrong of ['/nope', '/letters/draft/extra', '/more/unlock', '/_sitemap']) assert.equal(screenForPath(wrong).route, '/+not-found', wrong);
  const lost = byRoute('/+not-found');
  assert.ok(fs.existsSync(path.join(root, lost.file)), 'expo-router serves app/+not-found.tsx for an unmatched address');
  assert.ok(lost.links.includes(FIRST) && lost.links.includes(HOME));
});

// Hostile review: the Letter of Explanation Kit screen was headed "Credit Letter Kit".
test('the kit screen is headed with the name of the kit it shows', () => {
  assert.equal(titleFor('/letters/unlock', { kit: 'letter-of-explanation-kit' }), 'Letter of Explanation Kit');
  assert.equal(titleFor('/letters/unlock', { kit: 'credit-letter-kit' }), 'Credit Letter Kit');
  assert.equal(titleFor('/letters/unlock'), 'Credit Letter Kit');
  assert.equal(titleFor('/letters/bundle', { kit: 'letter-of-explanation-kit' }), 'Complete ApprovalPrep Bundle');
  assert.equal(titleFor('/letters/files', { kit: 'rental-application-kit' }), 'Rental Application Kit');
});
