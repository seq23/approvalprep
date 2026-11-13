import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Button, Row, Screen } from '../../../src/ui';
import { type, space, color } from '../../../src/theme';
import { PRIVACY_LINE } from '../../../src/copy';
import { MORE_LINKS, deletionController } from '../../../src/more';
import { savedLetters } from '../../../src/savedLetters';
export default function More() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const deletion = useMemo(() => deletionController(async () => { await (await savedLetters()).removeAll(); }), []);
  async function remove() {
    setBusy(true); setMessage('');
    try { if (await deletion.confirm()) { setConfirming(false); setMessage('Your letters have been deleted from this phone.'); } }
    catch { setMessage('Your letters could not be deleted. Try again.'); }
    finally { setBusy(false); }
  }
  return <Screen route="/more" label="More" title="About ApprovalPrep">
    <Text style={type.body}>{PRIVACY_LINE}</Text>
    <Text style={type.body}>You write and send every letter yourself.</Text>
    <Row title="Complete ApprovalPrep Bundle" sub="Both kits and the document library" onPress={() => router.push('/letters/bundle')} />
    <Row title="Restore purchase" sub="Choose your kit or bundle to restore it" onPress={() => router.push('/letters/unlock')} />
    {MORE_LINKS.map(link => <Row key={link.url} title={link.label} onPress={() => { Linking.openURL(link.url).catch(() => setMessage('Could not open the page. Try again when you are online.')); }} />)}
    <View style={{ marginTop: space[6], paddingTop: space[4], borderTopWidth: 1, borderColor: color.rule, gap: space[3] }}>
      <Button label="Delete all my letters" disabled={busy || confirming} onPress={() => { deletion.request(); setConfirming(true); setMessage(''); }} />
      {confirming ? <>
        <Text style={type.body}>Delete every saved letter and its details from this phone? This cannot be undone.</Text>
        <Button label="Yes, delete" disabled={busy} onPress={remove} />
        <Button label="Keep" disabled={busy} onPress={() => { deletion.keep(); setConfirming(false); }} />
      </> : null}
    </View>
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
  </Screen>;
}
