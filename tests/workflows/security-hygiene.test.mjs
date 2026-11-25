// Guards for the 25 Nov 2026 code-scanning fixes. Each test fails if the
// matching fix is undone, and each list check fails if it examined nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { removeElements, removeComments, stripTags, escapeRegExp, inlineJson } from '../../scripts/lib/html_text.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('removeElements removes every closing-tag form and nested re-forms', () => {
  const html = '<p>a</p><SCRIPT>x</SCRIPT ><script type="m">y</script foo><scr<script>z</script>ipt>w</script><style>s</style>';
  const out = removeElements(html, ['script', 'style']);
  assert.doesNotMatch(out, /<script\b/i);
  assert.doesNotMatch(out, /<style\b/i);
  assert.match(out, /<p>a<\/p>/);
});

test('removeComments and stripTags leave no markup', () => {
  assert.doesNotMatch(removeComments('a<!-<!-- x -->- y -->b'), /<!--/);
  assert.doesNotMatch(stripTags('<<b>i>text</b>'), /<[^>]+>/);
});

test('escapeRegExp makes every metacharacter literal', () => {
  const s = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o/p';
  assert.ok(new RegExp(escapeRegExp(s)).test(s));
  assert.ok(!new RegExp(escapeRegExp('a.b')).test('axb'));
});

test('inlineJson cannot close a script or open a comment', () => {
  const out = inlineJson({ p: '</script><!--\u2028&' });
  assert.doesNotMatch(out, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(out), { p: '</script><!--\u2028&' });
});

test('install_clarity injects the loader with inlineJson, not raw JSON', () => {
  const src = read('scripts/install_clarity.mjs');
  assert.match(src, /inlineJson\(/);
  assert.doesNotMatch(src, /JSON\.stringify\(projects\)/);
});

test('track-event never returns the exception text to the caller', () => {
  const src = read('functions/api/track-event.js');
  assert.doesNotMatch(src, /String\((e|err|error)\)|(e|err|error)\.(message|stack)\b[^;]*json/i);
  assert.match(src, /D1_WRITE_FAILED/);
});

test('every workflow declares least-privilege permissions', () => {
  const dir = new URL('../../.github/workflows/', import.meta.url);
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(files.length > 0, 'no workflow files examined');
  const missing = files.filter((f) => !/^permissions:/m.test(readFileSync(new URL(f, dir), 'utf8')) && !/^\s+permissions:/m.test(readFileSync(new URL(f, dir), 'utf8')));
  assert.deepEqual(missing, []);
});
