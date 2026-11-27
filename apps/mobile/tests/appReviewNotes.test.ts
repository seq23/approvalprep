// The App Store review notes (store/app-review-notes.txt, pasted into App Store Connect > App Review
// Information > Notes) send a reviewer to buttons by their exact words. Fails if the notes run past
// Apple's 4,000 characters, or any quoted button or screen label is missing from the app's own screens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const notes = fs.readFileSync(path.join(root, 'store/app-review-notes.txt'), 'utf8');
const screens = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? screens(path.join(dir, e.name)) : /\.(tsx?|mjs)$/.test(e.name) ? [fs.readFileSync(path.join(dir, e.name), 'utf8')] : []);
const appText = [...screens(path.join(root, 'app')), ...screens(path.join(root, 'src'))].join('\n');
// Quoted words that are not app labels: the FTC page title the notes cite as a source.
const SOURCES = new Set(['Fixing Your Credit FAQs']);

test('review notes fit Apple\'s 4,000 characters', () => {
  assert.ok(notes.trim().length > 1000 && notes.length <= 4000, `notes ${notes.length}`);
});

test('every label the review notes quote is on an app screen', () => {
  const quoted = [...notes.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((q) => !SOURCES.has(q));
  assert.ok(quoted.length >= 8, `only ${quoted.length} quoted labels read`);
  for (const q of quoted) assert.ok(appText.includes(q), `"${q}" is quoted in the review notes but no screen says it`);
});
