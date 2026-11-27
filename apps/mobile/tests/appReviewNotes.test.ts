// The App Store review notes (store/app-review-notes.txt, pasted into App Store Connect > App Review
// Information > Notes) send a reviewer to buttons by their exact words. Fails if the notes run past Apple's
// 4,000 characters, if a quoted label is not mapped to the screen the notes send the reviewer to, or if that
// screen does not show that exact label ON iOS: web-only branches (`Platform.OS === 'web' ? … :`) and
// bottom sheets are cut out before the label is looked for, so a web label or a sheet button never passes
// (the 27 Nov 2026 store review caught "Write the free dispute letter", a sheet button, and "Save as PDF",
// the web label, both passed by the old substring check).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const notes = fs.readFileSync(path.join(root, 'store/app-review-notes.txt'), 'utf8');

// Each label the notes quote, and the screen(s) the notes send the reviewer to for it.
const HOME = 'app/(tabs)/index.tsx', LETTER = 'app/(tabs)/letters/draft.tsx', MORE = 'app/(tabs)/more/index.tsx';
const KIT = 'app/(tabs)/letters/unlock.tsx', FILE_KIT = 'app/(tabs)/letters/files.tsx', BUNDLE = 'app/(tabs)/letters/bundle.tsx';
const WHERE: Record<string, string[]> = {
  'Free credit bureau dispute letter': [HOME],
  'Save or share PDF': [LETTER],
  'Print': [LETTER],
  'Mark as sent': [LETTER],
  'Get this kit': [KIT, FILE_KIT],
  'Restore purchase': [KIT, FILE_KIT, BUNDLE],
  'Restore a purchase': [MORE],
  'Bought on approvalprep.com?': [MORE],
  'Open my website kit': [MORE],
};
// Quoted words that are not buttons: the FTC page title cited as a source, and the self-help line every
// letter screen prints (src/copy.ts).
const NOT_LABELS: Record<string, string> = {
  'Fixing Your Credit FAQs': '',
  'Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.': 'src/copy.ts',
};

/** What a screen shows on iOS: bottom sheets and web-only branches removed. Throws if a web branch is left. */
function iosText(file: string): string {
  let src = fs.readFileSync(path.join(root, file), 'utf8');
  src = src.replace(/<BottomSheet[\s\S]*?<\/BottomSheet>/g, '');
  src = src.replace(/Platform\.OS === 'web' \? '[^']*' : /g, '');
  src = src.replace(/Platform\.OS !== 'web' \? (<[\s\S]*?\/>) : <Text[^>]*>[^<]*<\/Text>/g, '$1');
  assert.doesNotMatch(src, /Platform\.OS [!=]== 'web'/, `${file}: a web-only branch this test cannot read; extend iosText`);
  return src;
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const shows = (text: string, label: string) => new RegExp(`["'\`>]${esc(label)}(?: ›)?["'\`<,]`).test(text);

test('review notes fit Apple\'s 4,000 characters', () => {
  assert.ok(notes.trim().length > 1000 && notes.length <= 4000, `notes ${notes.length}`);
});

test('every label the review notes quote is on the iOS screen the notes name', () => {
  const quoted = [...notes.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(quoted.length >= 10, `only ${quoted.length} quoted labels read`);
  for (const q of quoted) {
    if (q in NOT_LABELS) {
      if (NOT_LABELS[q]) assert.ok(fs.readFileSync(path.join(root, NOT_LABELS[q]), 'utf8').includes(q), `"${q}" is not in ${NOT_LABELS[q]}`);
      continue;
    }
    assert.ok(WHERE[q], `"${q}" is quoted in the review notes but not mapped to a screen in this test`);
    for (const file of WHERE[q]) assert.ok(shows(iosText(file), q), `"${q}" is quoted in the review notes but ${file} does not show it on iOS`);
  }
});

test('the notes start the free letter from Home and say the reminder comes with a kit', () => {
  const steps = notes.split('\n').filter((l) => l.startsWith('- '));
  const home = steps.findIndex((l) => l.includes('"Free credit bureau dispute letter"'));
  const sent = steps.findIndex((l) => l.includes('"Mark as sent"'));
  assert.ok(home >= 0 && sent > home, 'the Home step comes before the Mark as sent step');
  assert.match(steps[home], /^- Home: tap "Free credit bureau dispute letter"/);
  assert.match(steps[sent], /reminder[^.]*come with a kit/);
});
