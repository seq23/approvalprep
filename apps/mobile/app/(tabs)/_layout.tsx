import { Tabs } from 'expo-router/tabs';
import { color, font } from '../../src/theme';
import { TABS } from '../../src/screens';
// Three tabs, words only, always visible (make-it-calm section 7). Android back from another
// tab's root returns to Write a letter.
export default function TabsLayout() {
  return (
    <Tabs backBehavior="firstRoute" screenOptions={{ headerShown: false, tabBarActiveTintColor: color.carbon, tabBarInactiveTintColor: color.carbonMuted,
      tabBarStyle: { backgroundColor: color.paperRaised, borderTopColor: color.rule },
      tabBarLabelStyle: { fontFamily: font.bodyBold, fontSize: 14 }, tabBarIconStyle: { display: 'none' } }}>
      {TABS.map(t => <Tabs.Screen key={t.tab} name={t.tab} options={{ title: t.label }} />)}
    </Tabs>
  );
}
