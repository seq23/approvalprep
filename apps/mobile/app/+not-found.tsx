import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Screen } from '../src/ui';
import { type } from '../src/theme';
// An address the app does not have. A plain page with a way home, never the developer's
// "Unmatched Route" page.
export default function NotFound() {
  return <Screen route="/+not-found" label="ApprovalPrep" title="That page is not in the app">
    <Text style={type.body}>The address may be mistyped, or the page may have moved. Your saved letters are still on this phone.</Text>
    <Button primary label="Go to the first screen ›" onPress={() => router.replace('/')} />
    <Button label="Write a letter ›" onPress={() => router.replace('/letters')} />
  </Screen>;
}
