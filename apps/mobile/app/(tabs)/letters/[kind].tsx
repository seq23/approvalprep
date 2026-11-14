import { storageDeadline } from '../../../src/phoneDatabase';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Button, Field, Row, Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT, REQUEST_LINE } from '../../../src/copy';
import { kitOfferFor } from '../../../src/offers';
import { bureaus, disputeQuestions, draftWriter, newDispute } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { ALL_KIT_KINDS, kitForKind, KIT_LOCKED_LINE, kitLetter, loadDeliveredKit, newKitDraft, type KitKind, type KitLetter } from '../../../src/kitTemplates';
import { LETTERS, EXPLANATION_LETTERS, isCreditLetter } from '../../../src/letters';
import { studioStep } from '../../../src/studioDrafts';
// Each question is its own step in the tab's history (like the Letter Studio), so "← Back" on
// question 4 goes to question 3, never out of the letter. `edit=1` opens one question from the
// draft's answer list and returns to the draft. `resumed=1` is her latest unfinished letter.
// The last save from any question screen. A question shown again (Back from a later one) waits
// for it, then reads the draft from the phone, so it never writes back answers older than the
// ones a later question just saved.
let lastSave: Promise<unknown> = Promise.resolve();
const newId = () => `letter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export default function Questions() {
  const { kind, id, step: stepParam, edit, resumed } = useLocalSearchParams<{ kind: string; id?: string; step?: string; edit?: string; resumed?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [stored, setStored] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState('Opening your draft…');
  const [failed, setFailed] = useState(false);
  // undefined = still looking on the phone; null = this kit letter has not been delivered.
  const [paid, setPaid] = useState<KitLetter | null | undefined>(undefined);
  const free = kind === 'bureau-dispute';
  const write = useRef<ReturnType<typeof draftWriter> | null>(null);
  const revision = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const draftId = useRef(id ?? newId());
  // The newest version of the letter, updated the moment she types, so a tap on Next straight after
  // typing (before the screen has redrawn) saves and reads her latest words (sim test: "Jordan Av").
  const latest = useRef<SavedLetter | null>(null);
  const shown = useRef(false);
  useEffect(() => {
    let active = true;
    setLoadError(false); setLetter(null); setPaid(undefined); setMessage('Opening your draft…');
    storageDeadline((async () => {
      const template = free ? null : kitLetter(await loadDeliveredKit(kitForKind(kind), true), kind);
      if (!active) return;
      setPaid(template);
      if (!free && !template) return;
      const store = await savedLetters();
      if (id) draftId.current = id;
      let draft = await store.get(draftId.current);
      if (draft && draft.kind !== kind) throw Error('DRAFT_NOT_FOUND');
      // A new letter is stored on its first answer, never on open.
      const found = !!draft;
      if (!draft) draft = template ? newKitDraft(draftId.current, template.kind) : newDispute(draftId.current);
      if (!active) return;
      write.current = draftWriter(store, found); setStored(found); latest.current = draft; setLetter(draft); setMessage(found ? 'Saved on this phone.' : 'Your answers save on this phone as you type.');
    })()).catch(() => { if (active) { setLoadError(true); setMessage('Your draft could not be opened. Please try again.'); } });
    return () => { active = false; };
  }, [kind, id, attempt]);
  useFocusEffect(useCallback(() => {
    if (!shown.current) { shown.current = true; return; }
    let active = true;
    lastSave.catch(() => {}).then(async () => {
      const store = await savedLetters();
      const fresh = await store.get(draftId.current);
      if (!active || !fresh || fresh.kind !== kind) return;
      write.current = draftWriter(store, true); latest.current = fresh; setStored(true); setLetter(fresh);
    }).catch(() => {});
    return () => { active = false; };
  }, [kind]));
  /** One answer changed, on top of the newest version of the letter (never a stale render's copy). */
  const answer = (name: string, value: string) => persist({ ...latest.current!, answers: { ...latest.current!.answers, [name]: value } });
  function persist(next: SavedLetter) {
    latest.current = next;
    setLetter(next); setFailed(false); setMessage('Saving…');
    const version = ++revision.current;
    const saved = write.current!(next);
    pending.current = saved; lastSave = saved;
    saved.then(() => {
      if (version === revision.current) { setStored(true); setMessage('Saved on this phone.'); }
    }).catch(() => {
      if (version === revision.current) { setFailed(true); setMessage('Your latest answers could not be saved. Try saving again before continuing.'); }
    });
  }
  // The next screen opens only after the last answer is on the phone, so it reads what she just typed.
  // A failed save keeps her here, with "Try saving again". Next stays tappable while a save runs (it
  // waits for it): disabling it on each key swallowed a quick tap and redrew the screen on every key.
  const after = (then: () => void) => { pending.current.then(then, () => {}); };
  if (loadError) return <Screen route="/letters/[kind]" label="Write a letter" title="Your draft could not be opened">
    <Text accessibilityRole="alert" style={type.sub}>{message}</Text>
    <Button label="Try again" onPress={() => setAttempt(value => value + 1)} />
    <Button label="Write a letter ›" onPress={() => router.replace('/letters')} />
  </Screen>;
  if (!free && !paid) {
    const name = [...LETTERS, ...EXPLANATION_LETTERS].find(l => l.kind === kind)?.name ?? 'Write a letter';
    return <Screen route="/letters/[kind]" label={kitForKind(kind) === 'credit-letter-kit' ? 'Credit Letter Kit' : 'Letter of Explanation Kit'} title={name}>
      <Text style={type.sub}>{isCreditLetter(kind) ? HONEST_LIMIT : REQUEST_LINE}</Text>
      {paid === undefined && ALL_KIT_KINDS.includes(kind as KitKind) ? <Text style={type.sub} accessibilityLiveRegion="polite">Opening…</Text>
        : <><Text style={type.body}>{kitForKind(kind) === 'credit-letter-kit' ? KIT_LOCKED_LINE : 'This letter is included in the Letter of Explanation Kit.'}</Text><Button label={`See the ${kitOfferFor(kitForKind(kind)).name} ›`} onPress={() => router.replace({ pathname: '/letters/unlock', params: { kit: kitForKind(kind), letter: kind } })} /></>}
    </Screen>;
  }
  const questions = paid ? paid.questions : disputeQuestions;
  const step = studioStep(stepParam, questions.length);
  const question = questions[step];
  const editing = edit === '1';
  const last = step === questions.length - 1;
  const go = (next: number) => after(() => router.push({ pathname: '/letters/[kind]', params: { kind, id: draftId.current, step: String(next) } }));
  return <Screen route="/letters/[kind]" label={`Question ${step + 1} of ${questions.length}`} title={question.title}>
    <Text style={type.sub}>{isCreditLetter(kind) ? HONEST_LIMIT : REQUEST_LINE}</Text>
    {paid?.honestLine ? <Text style={type.sub}>{paid.honestLine}</Text> : null}
    <Text style={type.sub} accessibilityLiveRegion="polite">{resumed === '1' && step === 0 && stored ? 'This is the letter you started before. Your answers are filled in.' : message}</Text>
    {letter ? <>
      {free && question.fields.length === 0 ? (bureaus as { id: string; name: string }[]).map(bureau => <Row key={bureau.id} title={bureau.name} selected={letter.answers.bureau === bureau.id} onPress={() => answer('bureau', bureau.id)} />) : question.fields.map(field => <Field key={field.name} label={field.label} multiline={field.multiline} kind={'kind' in field && field.kind === 'ssn4' ? 'ssn4' : 'text'} value={letter.answers[field.name] ?? ''} onChangeText={value => answer(field.name, value)} />)}
      <Text style={type.sub}>You can leave a blank. It will appear in brackets for you to fill before mailing.</Text>
      {failed ? <Button label="Try saving again" onPress={() => persist(latest.current!)} /> : null}
      {editing ? <Button primary disabled={failed} label="Save and read my draft ›" onPress={() => after(() => router.back())} />
        : <Button primary disabled={failed} label={last ? 'Read my draft ›' : 'Next question ›'} onPress={() => last ? (persist(latest.current!), after(() => router.push({ pathname: '/letters/draft', params: { id: draftId.current } }))) : go(step + 1)} />}
      {step > 0 && !editing ? <Button label="← Previous question" onPress={() => router.back()} /> : null}
      {resumed === '1' && step === 0 && stored ? <Button label="Start a blank one instead" onPress={() => router.replace({ pathname: '/letters/[kind]', params: { kind, id: newId() } })} /> : null}
    </> : null}
  </Screen>;
}
