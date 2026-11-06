import { Tabs } from 'expo-router/tabs';
import { color, font } from '../../src/theme';
// Three tabs, words only (make-it-calm: at most four; no icon font, no emoji).
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: color.carbon, tabBarInactiveTintColor: color.carbonMuted,
      tabBarStyle: { backgroundColor: color.paperRaised, borderTopColor: color.rule },
      tabBarLabelStyle: { fontFamily: font.bodyBold, fontSize: 13 }, tabBarIconStyle: { display: 'none' } }}>
      <Tabs.Screen name="letters" options={{ title: 'Write a letter' }} />
      <Tabs.Screen name="mine" options={{ title: 'My letters' }} />
      <Tabs.Screen name="more" options={{ title: '☰ More' }} />
    </Tabs>
  );
}
