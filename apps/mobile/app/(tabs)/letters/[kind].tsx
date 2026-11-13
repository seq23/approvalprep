import { storageDeadline } from '../../../src/phoneDatabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Button, Field, Row, Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { bureaus, disputeQuestions, draftWriter, newDispute } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { ALL_KIT_KINDS, kitForKind, KIT_LOCKED_LINE, kitLetter, loadDeliveredKit, newKitDraft, type KitKind, type KitLetter } from '../../../src/kitTemplates';
import { LETTERS, EXPLANATION_LETTERS } from '../../../src/letters';
export default function Questions() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Opening your draft…');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // undefined = still looking on the phone; null = this kit letter has not been delivered.
  const [paid, setPaid] = useState<KitLetter | null | undefined>(undefined);
  const free = kind === 'bureau-dispute';
  const write = useRef<ReturnType<typeof draftWriter> | null>(null);
  const revision = useRef(0);
  const draftId = useRef(id ?? `letter-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    let active = true;
    setLoadError(false); setLetter(null); setStep(0); setPaid(undefined); setMessage('Opening your draft…');
    storageDeadline((async () => {
      const template = free ? null : kitLetter(await loadDeliveredKit(kitForKind(kind), true), kind);
      if (!active) return;
      setPaid(template);
      if (!free && !template) return;
      const store = await savedLetters();
      if (id) draftId.current = id;
      let draft = await store.get(draftId.current);
      if (id && (!draft || draft.kind !== kind)) throw Error('DRAFT_NOT_FOUND');
      // A new letter is stored on its first answer, never on open.
      const stored = !!draft;
      if (!draft) draft = template ? newKitDraft(draftId.current, template.kind) : newDispute(draftId.current);
      if (!active) return;
      write.current = draftWriter(store, stored); setLetter(draft); setMessage(stored ? 'Saved on this phone.' : 'Your answers save on this phone as you type.');
    })()).catch(() => { if (active) { setLoadError(true); setMessage('Your draft could not be opened. Please try again.'); } });
    return () => { active = false; };
  }, [kind, id, attempt]);
  function persist(next: SavedLetter, then?: () => void) {
    setLetter(next); setSaving(true); setFailed(false); setMessage('Saving…');
    const version = ++revision.current;
    write.current!(next).then(() => {
      if (version === revision.current) { setSaving(false); setMessage('Saved on this phone.'); then?.(); }
    }).catch(() => {
      if (version === revision.current) { setSaving(false); setFailed(true); setMessage('Your latest answers could not be saved. Try saving again before continuing.'); }
    });
  }
  if (loadError) return <Screen route="/letters/[kind]" label="Write a letter" title="Your draft could not be opened">
    <Text accessibilityRole="alert" style={type.sub}>{message}</Text>
    <Button label="Try again" onPress={() => setAttempt(value => value + 1)} />
    <Button label="Write a letter ›" onPress={() => router.replace('/letters')} />
  </Screen>;
  if (!free && !paid) {
    const name = [...LETTERS, ...EXPLANATION_LETTERS].find(l => l.kind === kind)?.name ?? 'Write a letter';
    return <Screen route="/letters/[kind]" label={kitForKind(kind) === 'credit-letter-kit' ? 'Credit Letter Kit' : 'Letter of Explanation Kit'} title={name}>
      <Text style={type.sub}>{HONEST_LIMIT}</Text>
      {paid === undefined && ALL_KIT_KINDS.includes(kind as KitKind) ? <Text style={type.sub} accessibilityLiveRegion="polite">Opening…</Text>
        : <><Text style={type.body}>{kitForKind(kind) === 'credit-letter-kit' ? KIT_LOCKED_LINE : 'This letter is included in the Letter of Explanation Kit.'}</Text><Button label="See the kit ›" onPress={() => router.replace({ pathname: '/letters/unlock', params: { kit: kitForKind(kind) } })} /></>}
    </Screen>;
  }
  const questions = paid ? paid.questions : disputeQuestions;
  const question = questions[Math.min(step, questions.length - 1)];
  return <Screen route="/letters/[kind]" label={`Question ${step + 1} of ${questions.length}`} title={question.title}>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {paid?.honestLine ? <Text style={type.sub}>{paid.honestLine}</Text> : null}
    <>
      <Text style={type.sub} accessibilityLiveRegion="polite">{message}</Text>
      {letter ? <>
        {free && step === 1 ? (bureaus as { id: string; name: string }[]).map(bureau => <Row key={bureau.id} title={bureau.name} selected={letter.answers.bureau === bureau.id} onPress={() => persist({ ...letter, answers: { ...letter.answers, bureau: bureau.id } })} />) : question.fields.map(field => <Field key={field.name} label={field.label} multiline={field.multiline} value={letter.answers[field.name] ?? ''} onChangeText={value => persist({ ...letter, answers: { ...letter.answers, [field.name]: value } })} />)}
        <Text style={type.sub}>You can leave a blank. It will appear in brackets for you to fill before mailing.</Text>
        {failed ? <Button label="Try saving again" onPress={() => persist(letter)} /> : null}
        <Button primary disabled={saving || failed} label={step === questions.length - 1 ? 'Read my draft ›' : 'Next question ›'} onPress={() => step === questions.length - 1 ? persist(letter, () => router.push({ pathname: '/letters/draft', params: { id: letter.id } })) : setStep(step + 1)} />
        {step > 0 ? <Button label="← Previous question" onPress={() => setStep(step - 1)} /> : null}
      </> : null}
    </>
  </Screen>;
}
