import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, Share, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Field, Row, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { situations, studioDraft } from '../../../src/studio';

export default function Studio() {
  const [id, setId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [reading, setReading] = useState(false);
  const [showKit, setShowKit] = useState(false);
  const [message, setMessage] = useState('');
  const situation = situations.find(s => s.id === id);
  const draft = situation ? studioDraft(situation.id, answers) : null;
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
  function choose(next: string) {
    if (next === 'credit-dispute') { router.push('/letters/bureau-dispute'); return; }
    setId(next); setAnswers({}); setStep(0); setReading(false); setShowKit(false); setMessage('');
  }
  const field = situation?.fields[step];
  return <Screen route="/letters/studio" label="Free Letter Studio" title={!situation ? 'What do you need to write?' : reading ? 'Your first-pass draft' : field!.label}>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {!situation ? <>
      <Text style={type.body}>A first-pass letter to copy or share. No account. Your answers stay here until you leave this screen.</Text>
      {situations.map(s => <Row key={s.id} title={s.label} sub={s.kind === 'dispute' ? 'Free dispute letter · PDF included' : 'Free first-pass draft'} onPress={() => choose(s.id)} />)}
    </> : reading && draft ? <>
      <Text style={type.sub}>Check every fact and fill any brackets before you send it.</Text>
      <Sheet><Text selectable style={type.body}>{draft.text}</Text></Sheet>
      <Button primary label="Copy draft" onPress={copy} />
      <Button label="Share draft" onPress={share} />
      <Text style={type.sub} accessibilityLiveRegion="polite">{message}</Text>
      <Button label="Edit my answers" onPress={() => setReading(false)} />
      <Button label={`What the kit adds › ${draft.kitName}`} onPress={() => setShowKit(!showKit)} />
      {showKit ? <Sheet><Text style={type.subhead}>{draft.kitName}</Text>{draft.moments.map(m => <Text key={m.when} style={type.body}>{m.when}{'\n'}{m.items.join('\n')}</Text>)}<Button label={draft.kitRoute.pathname === '/letters/bundle' ? 'See the bundle with this kit ›' : 'See the kit ›'} onPress={() => router.push(draft.kitRoute.pathname === '/letters/bundle' ? '/letters/bundle' : { pathname: '/letters/unlock', params: draft.kitRoute.params })} /></Sheet> : null}
      <Button label="Choose another situation" onPress={() => setId(null)} />
    </> : field ? <>
      <Field label={field.label} defaultHint={field.hint} multiline={field.kind === 'long' || field.kind === 'lines'} value={answers[field.name] ?? ''} onChangeText={value => setAnswers({ ...answers, [field.name]: value })} />
      <Text style={type.sub}>You may leave a blank to fill before sending.</Text>
      <Button primary label={step === situation.fields.length - 1 ? 'Read my draft ›' : 'Next question ›'} onPress={() => step === situation.fields.length - 1 ? setReading(true) : setStep(step + 1)} />
      {step > 0 ? <Button label="← Previous question" onPress={() => setStep(step - 1)} /> : <Button label="Choose another situation" onPress={() => setId(null)} />}
    </> : null}
  </Screen>;
}
