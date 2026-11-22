// More > "Have a review code?": Google Play's app reviewer reaches every paid kit with the code from the review notes.
// Android only (Platform.OS === 'android'), with the store account (not the mock or web preview), while she does not
// own the bundle and only while approvalprep.com says a review window is open (GET /api/review 200). A customer at
// most sees one small grey line under Restore. Paid comes only from RevenueCat's own answer (src/purchases/review.ts).
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Button, Field, flushFields, useTypedText } from './ui';
import { type, space, color, tap } from './theme';
import { bundleAccount } from './purchases/bundleAccount';
import { restoreBundle } from './purchases/bundleDelivery';
import { installBundle } from './purchases/bundleFiles';
import { REVIEW_LINK, REVIEW_SAYS, REVIEW_USE, applyReviewCode, reviewWindowOpen } from './purchases/review';

export function ReviewCode() {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [code, setCode, codeNow] = useTypedText();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let live = true;
    (async () => {
      const account = await bundleAccount();
      if (account.mock || account.preview || (await account.ownership()).bundle) return;
      if (await reviewWindowOpen() && live) setOpen(true);
    })().catch(() => {});
    return () => { live = false; };
  }, []);
  async function use() {
    if (busy) return;
    setBusy(true); setSaid('');
    await flushFields();
    try {
      const result = await applyReviewCode(codeNow(), await bundleAccount(), account => restoreBundle(account, installBundle));
      setSaid(REVIEW_SAYS[result]);
      if (result === 'unlocked') setCode('');
    } catch { setSaid(REVIEW_SAYS.tryAgain); }
    finally { setBusy(false); }
  }
  if (Platform.OS !== 'android' || !open) return null;
  if (!shown) return <Pressable accessibilityRole="button" onPress={() => setShown(true)} style={{ minHeight: tap, justifyContent: 'center' }}>
    <Text style={[type.sub, { textDecorationLine: 'underline' }]}>{REVIEW_LINK}</Text>
  </Pressable>;
  return <View style={{ gap: space[3], paddingTop: space[2], borderTopWidth: 1, borderColor: color.rule }}>
    <Text style={type.sub}>For Google Play's app review. Type the 10-digit code from the review notes.</Text>
    <Field label="App review code" kind="digits" value={code} onChangeText={text => { setCode(text); setSaid(''); }} />
    <Button label={busy ? 'Checking…' : REVIEW_USE} disabled={busy} onPress={() => void use()} />
    {said ? <Text accessibilityRole="alert" style={type.sub}>{said}</Text> : null}
  </View>;
}
