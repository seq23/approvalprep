// Navigation map checks (make-it-calm section 7; the owner's tap-through of the sibling
// Dream Wedding app, 6 Nov 2026: "i cant go back or back to home or esc"). Back, Close and
// the tab bar are drawn from src/screens.ts, so the map being right is the app being navigable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { HOME, SCREENS, TABS, byRoute } from '../src/screens';

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
  assert.deepEqual([...seen].sort(), SCREENS.map(s => s.route).sort());
  for (const s of SCREENS) {
    const src = fs.readFileSync(path.join(root, s.file), 'utf8');
    assert.ok(src.includes(`<Screen route="${s.route}"`), `${s.file} does not draw <Screen> for ${s.route}`);
    for (const l of s.links) assert.ok(src.includes(`'${l}'`) || src.includes(l.replace('[kind]', '${')), `${s.id}: no button goes to ${l}`);
  }
});
