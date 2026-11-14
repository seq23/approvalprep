import { useRef } from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import { color, font } from '../../src/theme';
import { TABS, shownTab, type Tab } from '../../src/screens';
// Three tabs, words only, always visible (make-it-calm section 7). Android back from another
// tab's root returns to Write a letter. A screen opened from Home keeps Home lit (src/screens.ts,
// shownTab); tapping a tab always shows that tab's own first page.
export default function TabsLayout() {
  const pathname = usePathname();
  const { from } = useGlobalSearchParams<{ from?: string }>();
  const origin = useRef<Tab | null>(null);
  const shown = shownTab(pathname, from, origin.current);
  origin.current = shown.origin;
  return (
    <Tabs backBehavior="firstRoute" screenOptions={{ headerShown: false, tabBarActiveTintColor: color.carbon, tabBarInactiveTintColor: color.carbonMuted,
      tabBarStyle: { backgroundColor: color.paperRaised, borderTopColor: color.rule },
      tabBarLabelStyle: { fontFamily: font.bodyBold, fontSize: 14 }, tabBarIconStyle: { display: 'none' } }}>
      {TABS.map(t => <Tabs.Screen key={t.tab} name={t.tab} options={{ title: t.label,
        tabBarLabel: () => <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: shown.tab === t.tab ? color.carbon : color.carbonMuted }}>{t.label}</Text>,
        tabBarAccessibilityLabel: shown.tab === t.tab ? `${t.label}, current tab` : t.label }}
        listeners={({ navigation, route }) => ({ tabPress: () => {
          origin.current = null;
          // A stack left on a screen opened from another tab opens on its own first page.
          const state = (route as { state?: { key: string; index?: number } }).state;
          if (state && (state.index ?? 0) > 0 && !navigation.isFocused()) navigation.dispatch({ type: 'POP_TO_TOP', target: state.key });
        } })} />)}
    </Tabs>
  );
}
