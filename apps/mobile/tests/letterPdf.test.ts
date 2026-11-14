import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_MARGIN_PT, disputedParts, exportLetter, letterHtml, pdfFileName, type PdfTools } from '../src/letterPdf';
import { renderDispute } from '../src/letterQuestions';
import { SELF_HELP_LINE } from '../src/copy';
test('packet preserves blanks, escapes HTML, adds the free checklist and disclosure', () => {
  const letter = renderDispute({ name: '<script>alert(1)</script>', bureau: 'equifax', shows: 'Wrong balance' });
  const html = letterHtml(letter.text, true);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Equifax'));
  assert.ok(letter.blanks.length > 0);
  assert.ok(html.includes('<article>' + letter.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</article>'));
  assert.equal(html.split(`<footer>${SELF_HELP_LINE}</footer>`).length - 1, 2);
  assert.ok(html.includes('<li>'));
  assert.ok(!letterHtml('A delivered letter').includes('<section>'));
  const parts = disputedParts(letter.text, 'Wrong balance');
  assert.equal(parts.map(p => p.text).join(''), letter.text);
  assert.deepEqual(parts.filter(p => p.highlighted).map(p => p.text), ['wrong balance'], 'her words as they read in the sentence');
  assert.equal(disputedParts(letter.text).filter(p => p.highlighted).length, 0);
});
test('disputed entry highlights the normalized report paragraph rather than an earlier matching account', () => {
  for (const entry of ['60 days late\nin march 2026', 'Example Account', '  Wrong\t balance.; ']) {
    const letter = renderDispute({ account: entry, shows: entry });
    const parts = disputedParts(letter.text, entry);
    assert.equal(parts.map(part => part.text).join(''), letter.text);
    assert.equal(parts.filter(part => part.highlighted).length, 1);
    assert.ok(parts[0].text.includes('Account:'));
    assert.ok(parts[0].text.endsWith('The report shows this for the account above: '));
    assert.ok(parts[2].text.startsWith('. This is not accurate.'));
    assert.ok(!parts[1].text.includes('\n'));
  }
  assert.equal(disputedParts('Example Account', 'Example Account').some(part => part.highlighted), false);
});
test('native creates and shares a PDF; web and print open the document print flow', async () => {
  const calls: unknown[] = [];
  const names: string[] = [];
  const tools: PdfTools = {
    web: false, print: async html => { calls.push(['print', html]); },
    create: async (html, fileName) => { calls.push(['create', html]); names.push(fileName); return 'file:///letter.pdf'; },
    canShare: async () => true, share: async uri => { calls.push(['share', uri]); },
  };
  await exportLetter('packet', 'save', tools);
  assert.deepEqual(calls.splice(0), [['create', 'packet'], ['share', 'file:///letter.pdf']]);
  await exportLetter('packet', 'save', tools, pdfFileName('Credit bureau dispute letter', new Date(2026, 10, 14)));
  calls.splice(0);
  assert.equal(names.at(-1), 'Credit bureau dispute letter – November 14, 2026.pdf', 'the shared file is named after the letter, never a random id');
  await exportLetter('packet', 'save', { ...tools, web: true });
  await exportLetter('packet', 'print', tools);
  assert.deepEqual(calls.splice(0), [['print', 'packet'], ['print', 'packet']]);
  await assert.rejects(exportLetter('packet', 'save', { ...tools, canShare: async () => false }));
  assert.deepEqual(calls, []);
  await assert.rejects(exportLetter('packet', 'save', { ...tools, create: async () => { throw new Error('disk full'); } }), /disk full/);
  assert.deepEqual(calls, []);
});

test('web prints only its isolated packet and removes the frame after printing', async () => {
  const { saveOrPrintLetter } = await import('../src/letterExport.web');
  let printed = 0, removed = 0;
  let afterPrint: (() => void) | undefined;
  const frame = {
    title: '', style: {} as Record<string, string>, srcdoc: '', onload: undefined as undefined | (() => Promise<void>),
    remove: () => removed++, contentDocument: { fonts: { ready: Promise.resolve() } },
    contentWindow: { focus() {}, print() { printed++; }, addEventListener(event: string, cb: () => void) { assert.equal(event, 'afterprint'); afterPrint = cb; } },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: (tag: string) => { assert.equal(tag, 'iframe'); return frame; },
    body: { appendChild: (child: typeof frame) => { assert.equal(child, frame); void child.onload!(); } },
  } });
  try {
    await saveOrPrintLetter('<article>Only this letter</article>', 'save');
    assert.equal(frame.srcdoc, '<article>Only this letter</article>');
    assert.equal(printed, 1); assert.equal(removed, 0);
    afterPrint!(); assert.equal(removed, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, 'document', original);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('the PDF keeps at least 0.75in (54pt) from the paper edge, in a face whose zero has no slash, and its file name is safe', () => {
  assert.ok(PAGE_MARGIN_PT >= 54);
  const html = letterHtml('November 14, 2026', true, 'Rental: issue/letter');
  const margin = Number(/@page \{[^}]*margin: ([\d.]+)in/.exec(html)![1]);
  assert.ok(margin >= 0.75, `@page margin ${margin}in`);
  assert.match(html, /font: 12pt\/1\.45 Arial/);
  assert.doesNotMatch(pdfFileName('Rental: issue/letter', new Date(2026, 0, 2)), /[\/:]/);
  assert.equal(pdfFileName('  ', new Date(2026, 0, 2)), 'Your letter – January 2, 2026.pdf');
});
