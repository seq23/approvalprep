import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Row, Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
import { LETTERS, EXPLANATION_LETTERS, type LetterType } from '../../../src/letters';
import { kitLetter, kitForKind, loadDeliveredKit, EXPLANATION_KIT_ID, type KitTemplates } from '../../../src/kitTemplates';
import { BUNDLE_OFFER, CREDIT_KIT, EXPLANATION_KIT_OFFER, STUDIO_COUNT, kitOfferFor, lockedLine, offerTitle } from '../../../src/offers';
import { usePrices } from '../../../src/purchases/prices';
export default function Letters() {
  const [kits, setKits] = useState<(KitTemplates | null)[]>([]);
  const prices = usePrices();
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([loadDeliveredKit(), loadDeliveredKit(EXPLANATION_KIT_ID)]).then(value => { if (active) setKits(value); });
    return () => { active = false; };
  }, []));
  const open = (l: LetterType) => l.access === 'free' || kits.some(kit => kitLetter(kit, l.kind));
  // A locked letter names its kit and that kit's price; one she can open says so.
  const row = (l: LetterType) => {
    const kit = kitOfferFor(kitForKind(l.kind));
    return <Row key={l.kind} title={l.name} sub={`${l.access === 'free' ? 'Free every time' : open(l) ? 'In your kit' : lockedLine(kit.name, prices[kit.productId])} · ${l.when}`}
      onPress={() => router.push(open(l) ? `/letters/${l.kind}` : { pathname: '/letters/unlock', params: { kit: kitForKind(l.kind) } })} />;
  };
  return <Screen route="/letters" label="Write a letter" title="Which letter do you need?">
    <Text style={type.section} accessibilityRole="header">Free</Text>
    <Row title="Letter Studio" sub={`Free every time · A quick first draft for any of ${STUDIO_COUNT} situations, to copy or share`} onPress={() => router.push('/letters/studio')} />
    {LETTERS.filter(l => l.access === 'free').map(row)}
    <Text style={type.sub}>The dispute letter is the full letter: the bureau’s mailing address, a PDF and a before-you-mail list.</Text>
    <Text style={type.section} accessibilityRole="header">{CREDIT_KIT.name}</Text>
    <Row title={`See the ${offerTitle(CREDIT_KIT.name, prices[CREDIT_KIT.productId])}`} sub={CREDIT_KIT.what} onPress={() => router.push({ pathname: '/letters/unlock', params: { kit: CREDIT_KIT.id } })} />
    {LETTERS.filter(l => l.access !== 'free').map(row)}
    <Text style={type.section} accessibilityRole="header">{EXPLANATION_KIT_OFFER.name}</Text>
    <Row title={`See the ${offerTitle(EXPLANATION_KIT_OFFER.name, prices[EXPLANATION_KIT_OFFER.productId])}`} sub={EXPLANATION_KIT_OFFER.what} onPress={() => router.push({ pathname: '/letters/unlock', params: { kit: EXPLANATION_KIT_OFFER.id } })} />
    {EXPLANATION_LETTERS.map(row)}
    <Text style={type.section} accessibilityRole="header">Everything</Text>
    <Row title={offerTitle(BUNDLE_OFFER.name, prices[BUNDLE_OFFER.productId])} sub={BUNDLE_OFFER.what} onPress={() => router.push('/letters/bundle')} />
  </Screen>;
}
