import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Text } from 'react-native';
import { Button, Hl, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { renderDispute } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { KIT_KINDS, KIT_LOCKED_LINE, kitLetter, loadDeliveredKit, renderKitLetter, type KitKind, type KitLetter } from '../../../src/kitTemplates';
import { disputedParts, letterHtml } from '../../../src/letterPdf';
import { saveOrPrintLetter } from '../../../src/letterExport';
export default function Draft() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [message, setMessage] = useState('Opening your letter…');
  const [busy, setBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [paid, setPaid] = useState<KitLetter | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLetter(null); setPaid(null); setExportMessage('');
    savedLetters().then(store => id ? store.get(id) : null).then(async value => {
      const template = value && KIT_KINDS.includes(value.kind as KitKind) ? kitLetter(await loadDeliveredKit(), value.kind) : null;
      if (!active) return;
      setPaid(template);
      if (value && (value.kind === 'bureau-dispute' || template)) setLetter(value);
      else if (value && KIT_KINDS.includes(value.kind as KitKind)) { setLetter(null); setMessage(KIT_LOCKED_LINE); }
      else setMessage('This draft could not be found. Open Write a letter to start one.');
    }).catch(() => { if (active) setMessage('Your letter could not be loaded. Go back and try again.'); });
    return () => { active = false; };
  }, [id]));
  const rendered = !letter ? null : letter.kind === 'bureau-dispute' ? renderDispute(letter.answers) : paid && paid.kind === letter.kind ? renderKitLetter(paid, letter.answers) : null;
  const output = async (action: 'save' | 'print') => {
    if (!rendered || !letter || busy) return;
    setBusy(true); setExportMessage('');
    try { await saveOrPrintLetter(letterHtml(rendered.text, letter.kind === 'bureau-dispute'), action); }
    catch (error) { setExportMessage(error instanceof Error ? error.message : 'Your PDF could not be opened. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Screen route="/letters/draft" label="Your letter, first draft" title="Read it before you mail it">
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {rendered && letter ? <>
      <Sheet><Text selectable style={type.body}>{disputedParts(rendered.text, letter.kind === 'bureau-dispute' ? letter.answers.shows : '').map((part, index) => part.highlighted ? <Hl key={index}>{part.text}</Hl> : <Text key={index}>{part.text}</Text>)}</Text></Sheet>
      <Button primary label={busy ? 'Opening PDF…' : Platform.OS === 'web' ? 'Save as PDF or print ›' : 'Save or share PDF ›'} disabled={busy} onPress={() => void output('save')} />
      {Platform.OS !== 'web' ? <Button label="Print ›" disabled={busy} onPress={() => void output('print')} /> : <Text style={type.sub}>Choose Save as PDF in your browser’s print window, then share the saved file.</Text>}
      {exportMessage ? <Text accessibilityRole="alert" style={type.sub}>{exportMessage}</Text> : null}
      {rendered.blanks.length ? <Text style={type.sub}>Fill in the brackets before mailing: {rendered.blanks.join(', ')}.</Text> : null}
      {paid?.honestLine ? <Text style={type.sub}>{paid.honestLine}</Text> : null}
      {(paid?.notes ?? []).map(note => <Text key={note} style={type.sub}>{note}</Text>)}
      <Button label="Mark as sent ›" onPress={() => router.push({ pathname: '/letters/sent', params: { id: letter.id } })} />
      <Button label="Edit my answers ›" onPress={() => router.push({ pathname: '/letters/[kind]', params: { kind: letter.kind, id: letter.id } })} />
    </> : <Text style={type.sub}>{message}</Text>}
  </Screen>;
}
