import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Button, Field, Row, Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { bureaus, disputeQuestions, draftWriter, newDispute } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
export default function Questions() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Opening your draft…');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const write = useRef<ReturnType<typeof draftWriter> | null>(null);
  const revision = useRef(0);
  const draftId = useRef(id ?? `letter-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    let active = true;
    if (kind !== 'bureau-dispute') return;
    setLetter(null); setStep(0);
    (async () => {
      const store = await savedLetters();
      if (id) draftId.current = id;
      let draft = await store.get(draftId.current);
      if (id && (!draft || draft.kind !== kind)) throw Error('DRAFT_NOT_FOUND');
      if (!draft) {
        draft = newDispute(draftId.current);
        try { await store.create(draft); } catch (error) {
          // React may remount while the first insert is pending.
          const existing = await store.get(draftId.current);
          if (!existing || existing.kind !== kind) throw error;
          draft = existing;
        }
      }
      if (!active) return;
      write.current = draftWriter(store); setLetter(draft); setMessage('Saved on this phone.');
    })().catch(() => { if (active) setMessage('Your draft could not be opened. Go back and try again.'); });
    return () => { active = false; };
  }, [kind, id]);
  function persist(next: SavedLetter) {
    setLetter(next); setSaving(true); setFailed(false); setMessage('Saving…');
    const version = ++revision.current;
    write.current!(next).then(() => {
      if (version === revision.current) { setSaving(false); setMessage('Saved on this phone.'); }
    }).catch(() => {
      if (version === revision.current) { setSaving(false); setFailed(true); setMessage('Your latest answers could not be saved. Try saving again before continuing.'); }
    });
  }
  const question = disputeQuestions[step];
  return <Screen route="/letters/[kind]" label={`Question ${step + 1} of ${disputeQuestions.length}`} title={question.title}>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {kind !== 'bureau-dispute' ? <><Text style={type.body}>This letter is included in the Credit Letter Kit.</Text><Button label="See the kit ›" onPress={() => router.replace('/letters/unlock')} /></> : <>
      <Text style={type.sub} accessibilityLiveRegion="polite">{message}</Text>
      {letter ? <>
        {step === 1 ? (bureaus as { id: string; name: string }[]).map(bureau => <Row key={bureau.id} title={bureau.name} selected={letter.answers.bureau === bureau.id} onPress={() => persist({ ...letter, answers: { ...letter.answers, bureau: bureau.id } })} />) : question.fields.map(field => <Field key={field.name} label={field.label} multiline={field.multiline} value={letter.answers[field.name] ?? ''} onChangeText={value => persist({ ...letter, answers: { ...letter.answers, [field.name]: value } })} />)}
        <Text style={type.sub}>You can leave a blank. It will appear in brackets for you to fill before mailing.</Text>
        {failed ? <Button label="Try saving again" onPress={() => persist(letter)} /> : null}
        <Button primary disabled={saving || failed} label={step === disputeQuestions.length - 1 ? 'Read my draft ›' : 'Next question ›'} onPress={() => step === disputeQuestions.length - 1 ? router.push({ pathname: '/letters/draft', params: { id: letter.id } }) : setStep(step + 1)} />
        {step > 0 ? <Button label="← Previous question" onPress={() => setStep(step - 1)} /> : null}
      </> : null}
    </>}
  </Screen>;
}
