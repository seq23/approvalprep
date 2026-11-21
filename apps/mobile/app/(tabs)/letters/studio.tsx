import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Platform, Share, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Field, Row, Screen, Sheet, flushFields } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT, REQUEST_LINE } from '../../../src/copy';
import { isCreditLetter } from '../../../src/letters';
import { situations, studioDraft } from '../../../src/studio';
import { savedLetters } from '../../../src/savedLetters';
import { letterHtml } from '../../../src/letterPdf';
import { saveOrPrintLetter } from '../../../src/letterExport';
import { draftWriter } from '../../../src/letterQuestions';
import type { SavedLetter } from '../../../src/letterStorage';
import { showsUnderwriterGuide } from '../../../src/mortgage';
import { UnderwriterGuide } from '../../../src/MortgageMoment';
import { letterHref, latestStudioDraft, newStudioDraft, newStudioId, studioKind, studioStep } from '../../../src/studioDrafts';

// The free Letter Studio. Each question is its own step in the tab's history, so Back goes to the
// previous question; every answer is saved on the phone as it is typed (src/studioDrafts.ts), so
// Back, a tab change or a reload never loses it, and the draft is listed in My letters.
export default function Studio() {
  const params = useLocalSearchParams<{ situation?: string; id?: string; step?: string; view?: string; resumed?: string; edit?: string }>();
  const editing = params.edit === '1';
  const situation = situations.find(s => s.id === params.situation);
  const reading = params.view === 'draft';
  const step = studioStep(params.step, situation?.fields.length ?? 0);
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [stored, setStored] = useState(false);
  const resumed = params.resumed === '1';
  const [note, setNote] = useState('');
  const [showKit, setShowKit] = useState(false);
  const [message, setMessage] = useState('');
  const write = useRef<ReturnType<typeof draftWriter> | null>(null);
  const revision = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());
  // Read again every time this step comes back on show: a later question may have saved since.
  useFocusEffect(useCallback(() => {
    let active = true;
    setLetter(null); setNote(''); setMessage(''); setShowKit(false);
    if (!situation || !params.id) return;
    (async () => {
      const store = await savedLetters();
      const found = await store.get(params.id!);
      if (!active) return;
      const mine = found && found.kind === studioKind(situation.id) ? found : null;
      write.current = draftWriter(store, !!mine);
      setStored(!!mine); setLetter(mine ?? newStudioDraft(params.id!, situation.id));
      setNote(mine ? 'Saved on this phone.' : 'Your answers save on this phone as you type.');
    })().catch(() => { if (active) setNote('Your draft could not be opened. Go back and try again.'); });
    return () => { active = false; };
  }, [situation?.id, params.id]));
  function persist(next: SavedLetter) {
    setLetter(next); setNote('Saving…');
    const version = ++revision.current;
    pending.current = write.current!(next).then(() => { if (version === revision.current) { setStored(true); setNote('Saved on this phone.'); } })
      .catch(() => { if (version === revision.current) setNote('Your latest answer could not be saved. Type it again to retry.'); });
  }
  // The next step opens only after the box has finished editing (its last letters handed up, even when
  // the phone is slow) and that answer is on the phone, so the next screen reads what she just typed.
  const settled = () => flushFields().then(() => pending.current.catch(() => {}));
  const go = (extra: Record<string, string>) => { void settled().then(() => router.push({ pathname: '/letters/studio', params: { situation: situation!.id, id: params.id!, ...extra } })); };
  async function choose(next: string, fresh = false) {
    if (next === 'credit-dispute') { router.push({ ...await savedLetters().then(store => letterHref(store, 'bureau-dispute')).catch(() => ({ params: { kind: 'bureau-dispute' } })), pathname: '/letters/[kind]' }); return; }
    let last: SavedLetter | null = null;
    try { last = fresh ? null : await latestStudioDraft(await savedLetters(), next); } catch { /* A new draft is still possible. */ }
    router.push({ pathname: '/letters/studio', params: { situation: next, id: last?.id ?? newStudioId(), step: '0', ...(last ? { resumed: '1' } : {}) } });
  }
  const draft = situation && letter ? studioDraft(situation.id, letter.answers) : null;
  async function copy() {
    try { await Clipboard.setStringAsync(draft!.text); setMessage('Copied.'); }
    catch { setMessage('Copy could not open. Select the draft text to copy it.'); }
  }
  async function share() {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: draft!.text });
        else { await copy(); return; }
      } else await Share.share({ message: draft!.text });
      setMessage('');
    } catch { setMessage('Sharing closed. You can still copy your draft.'); }
  }
  // The same Save as PDF / Print as the dispute letter (finding #5): Home says "you print it and mail it".
  const [busy, setBusy] = useState(false);
  async function output(action: 'save' | 'print') {
    if (!draft || busy) return;
    setBusy(true); setMessage('');
    try { await saveOrPrintLetter(letterHtml(draft.text, false, situation!.label), action, situation!.label); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Your PDF could not be opened. Please try again.'); }
    finally { setBusy(false); }
  }
  const field = situation?.fields[step];
  const limit = situation ? <Text style={type.sub}>{isCreditLetter(studioKind(situation.id)) ? HONEST_LIMIT : REQUEST_LINE}</Text> : null;
  return <Screen route="/letters/studio" label="Free Letter Studio" title={!situation ? 'What do you need to write?' : reading ? 'Your first-pass draft' : field!.label}>
    {!situation ? <>
      <Text style={type.body}>A first-pass letter to save as a PDF, print, copy or share. Free every time, with no account. Your answers save on this phone as you type, and the draft is kept in My letters.</Text>
      {situations.map(s => <Row key={s.id} title={s.label} sub={s.kind === 'dispute' ? 'The full free dispute letter · PDF included' : 'Free first-pass draft'} onPress={() => void choose(s.id)} />)}
    </> : reading ? <>
      {limit}
      <Text style={type.sub}>Check every fact and fill any brackets before you send it.</Text>
      {draft ? <Sheet><Text selectable style={type.letter}>{draft.text}</Text></Sheet> : <Text style={type.sub} accessibilityLiveRegion="polite">{note || 'Opening your draft…'}</Text>}
      {draft ? <>
        <Button primary label={busy ? 'Opening PDF…' : Platform.OS === 'web' ? 'Save as PDF or print ›' : 'Save or share PDF ›'} disabled={busy} onPress={() => void output('save')} />
        {Platform.OS !== 'web' ? <Button label="Print ›" disabled={busy} onPress={() => void output('print')} /> : <Text style={type.sub}>Choose Save as PDF in your browser’s print window, then share the saved file.</Text>}
        <Button label="Copy draft" onPress={copy} />
        <Button label="Share draft" onPress={share} />
        {message ? <Text style={type.sub} accessibilityLiveRegion="polite">{message}</Text> : null}
        {stored ? <Text style={type.sub}>✓ Saved in My letters as a draft.</Text> : <Button label="Save to My letters ›" onPress={() => persist(letter!)} />}
        {stored ? <Button label="Open My letters ›" onPress={() => router.navigate('/mine')} /> : null}
        <Text style={type.section} accessibilityRole="header">Your answers</Text>
        <Text style={type.sub}>Tap one to change it.</Text>
        {situation.fields.map((f, n) => <Row key={f.name} answer title={f.label} sub={(letter!.answers[f.name] ?? '').trim().replace(/\s+/g, ' ').slice(0, 120) || 'Not answered yet'} onPress={() => go({ step: String(n), edit: '1' })} />)}
        <Button label={`What the ${draft.kitName} adds ${showKit ? '▴' : '▾'}`} onPress={() => setShowKit(!showKit)} />
        {showKit ? <Sheet>
          <Text style={type.subhead}>{draft.kitName}</Text>
          {draft.moments.map(m => <Text key={m.when} style={type.body}>{m.when}{'\n'}{m.items.join('\n')}</Text>)}
          <Button label={`See the ${draft.kitName} ›`} onPress={() => router.push(draft.kitRoute.pathname === '/letters/files' ? { pathname: '/letters/files', params: draft.kitRoute.params } : { pathname: '/letters/unlock', params: draft.kitRoute.params })} />
        </Sheet> : null}
        <Button label="Choose another situation" onPress={() => router.push('/letters/studio')} />
      </> : null}
    </> : field ? <>
      {limit}
      {showsUnderwriterGuide(situation.id, step) && !editing ? <UnderwriterGuide /> : null}
      <Text style={type.sub} accessibilityLiveRegion="polite">{resumed && step === 0 && stored ? 'This is the draft you started before. Your answers are filled in.' : note || 'Opening your draft…'}</Text>
      {letter ? <>
        <Field label={`Question ${step + 1} of ${situation.fields.length}`} spoken={field.label} defaultHint={field.hint} multiline={field.kind === 'long' || field.kind === 'lines'} value={letter.answers[field.name] ?? ''} onChangeText={value => persist({ ...letter, answers: { ...letter.answers, [field.name]: value } })} />
        <Text style={type.sub}>You may leave a blank to fill before sending.</Text>
        {editing ? <Button primary label="Save and read my draft ›" onPress={() => { void settled().then(() => router.back()); }} />
          : <Button primary label={step === situation.fields.length - 1 ? 'Read my draft ›' : 'Next question ›'} onPress={() => go(step === situation.fields.length - 1 ? { view: 'draft' } : { step: String(step + 1) })} />}
        {step > 0 && !editing ? <Button label="← Previous question" onPress={() => router.back()} /> : null}
        {resumed && step === 0 && stored ? <Button label="Start a blank one instead" onPress={() => void choose(situation.id, true)} /> : null}
      </> : null}
    </> : null}
  </Screen>;
}
