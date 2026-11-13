import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Platform, Share, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Field, Row, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT, REQUEST_LINE } from '../../../src/copy';
import { isCreditLetter } from '../../../src/letters';
import { situations, studioDraft } from '../../../src/studio';
import { notSoldHere } from '../../../src/offers';
import { savedLetters } from '../../../src/savedLetters';
import { draftWriter } from '../../../src/letterQuestions';
import type { SavedLetter } from '../../../src/letterStorage';
import { latestStudioDraft, newStudioDraft, newStudioId, studioKind, studioStep } from '../../../src/studioDrafts';

// The free Letter Studio. Each question is its own step in the tab's history, so Back goes to the
// previous question; every answer is saved on the phone as it is typed (src/studioDrafts.ts), so
// Back, a tab change or a reload never loses it, and the draft is listed in My letters.
export default function Studio() {
  const params = useLocalSearchParams<{ situation?: string; id?: string; step?: string; view?: string; resumed?: string }>();
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
  // The next step opens only after the last answer is on the phone, so it reads what she just typed.
  const go = (extra: Record<string, string>) => { void pending.current.finally(() => router.push({ pathname: '/letters/studio', params: { situation: situation!.id, id: params.id!, ...extra } })); };
  async function choose(next: string, fresh = false) {
    if (next === 'credit-dispute') { router.push('/letters/bureau-dispute'); return; }
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
  const field = situation?.fields[step];
  const limit = situation ? <Text style={type.sub}>{isCreditLetter(studioKind(situation.id)) ? HONEST_LIMIT : REQUEST_LINE}</Text> : null;
  const sold = draft ? draft.kitRoute.pathname !== '/letters/bundle' : true;
  return <Screen route="/letters/studio" label="Free Letter Studio" title={!situation ? 'What do you need to write?' : reading ? 'Your first-pass draft' : field!.label}>
    {!situation ? <>
      <Text style={type.body}>A first-pass letter to copy or share. Free every time, with no account. Your answers save on this phone as you type, and the draft is kept in My letters.</Text>
      {situations.map(s => <Row key={s.id} title={s.label} sub={s.kind === 'dispute' ? 'The full free dispute letter · PDF included' : 'Free first-pass draft'} onPress={() => void choose(s.id)} />)}
    </> : reading ? <>
      {limit}
      <Text style={type.sub}>Check every fact and fill any brackets before you send it.</Text>
      {draft ? <Sheet><Text selectable style={type.body}>{draft.text}</Text></Sheet> : <Text style={type.sub} accessibilityLiveRegion="polite">{note || 'Opening your draft…'}</Text>}
      {draft ? <>
        <Button primary label="Copy draft" onPress={copy} />
        <Button label="Share draft" onPress={share} />
        {message ? <Text style={type.sub} accessibilityLiveRegion="polite">{message}</Text> : null}
        {stored ? <Text style={type.sub}>✓ Saved in My letters as a draft.</Text> : <Button label="Save to My letters ›" onPress={() => persist(letter!)} />}
        {stored ? <Button label="Open My letters ›" onPress={() => router.navigate('/mine')} /> : null}
        <Button label="Edit my answers" onPress={() => go({ step: '0' })} />
        <Button label={`What the ${draft.kitName} adds ${showKit ? '▴' : '▾'}`} onPress={() => setShowKit(!showKit)} />
        {showKit ? <Sheet>
          <Text style={type.subhead}>{draft.kitName}</Text>
          {sold ? null : <Text style={type.body}>{notSoldHere(draft.kitName)}</Text>}
          {draft.moments.map(m => <Text key={m.when} style={type.body}>{m.when}{'\n'}{m.items.join('\n')}</Text>)}
          <Button label={sold ? `See the ${draft.kitName} ›` : 'See the Complete ApprovalPrep Bundle ›'} onPress={() => router.push('params' in draft.kitRoute ? { pathname: '/letters/unlock', params: draft.kitRoute.params } : '/letters/bundle')} />
        </Sheet> : null}
        <Button label="Choose another situation" onPress={() => router.push('/letters/studio')} />
      </> : null}
    </> : field ? <>
      {limit}
      <Text style={type.sub} accessibilityLiveRegion="polite">{resumed && step === 0 && stored ? 'This is the draft you started before. Your answers are filled in.' : note || 'Opening your draft…'}</Text>
      {letter ? <>
        <Field label={`Question ${step + 1} of ${situation.fields.length}`} spoken={field.label} defaultHint={field.hint} multiline={field.kind === 'long' || field.kind === 'lines'} value={letter.answers[field.name] ?? ''} onChangeText={value => persist({ ...letter, answers: { ...letter.answers, [field.name]: value } })} />
        <Text style={type.sub}>You may leave a blank to fill before sending.</Text>
        <Button primary label={step === situation.fields.length - 1 ? 'Read my draft ›' : 'Next question ›'} onPress={() => go(step === situation.fields.length - 1 ? { view: 'draft' } : { step: String(step + 1) })} />
        {step > 0 ? <Button label="← Previous question" onPress={() => router.back()} /> : null}
        {resumed && step === 0 && stored ? <Button label="Start a blank one instead" onPress={() => void choose(situation.id, true)} /> : null}
      </> : null}
    </> : null}
  </Screen>;
}
