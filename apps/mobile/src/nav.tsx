import React, { useEffect } from 'react';
import { BackHandler, Platform, Pressable, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { Stack } from 'expo-router';
import { color, font, type } from './theme';
import { HOME, SCREENS, byRoute, type Tab } from './screens';

// One way back from every screen: "← Back" (or "✕ Close" on a sheet), Android back and
// Escape all go to the previous screen, or to the screen's parent in the map if it was
// opened straight from a link, never out of the app.
export function goBack(route: string) {
  const s = byRoute(route);
  if (router.canGoBack()) router.back();
  else router.replace((s.back ?? HOME) as Href);
}

function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label.replace(/[←✕]\s*/, '')} onPress={onPress} hitSlop={8}
      style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', paddingRight: 12 }}>
      <Text style={[type.button, { color: color.carbon }]}>{label}</Text>
    </Pressable>
  );
}

export function headerFor(route: string) {
  const s = byRoute(route);
  return {
    title: s.title,
    headerBackVisible: false,
    headerLeft: () => (s.back ? <HeaderButton label={s.kind === 'sheet' ? '✕ Close' : '← Back'} onPress={() => goBack(route)} /> : null),
  };
}

export function useBackKeys(route: string) {
  const s = byRoute(route);
  useEffect(() => {
    if (!s.back) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(route); return true; });
    let off = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') goBack(route); };
      document.addEventListener('keydown', onKey);
      off = () => document.removeEventListener('keydown', onKey);
    }
    return () => { sub.remove(); off(); };
  }, [route, s.back]);
}

// One stack per tab: sub-screens and sheets keep the tab bar under them, Back stays inside
// the tab, and tapping the tab you are on pops back to its root.
export function TabStack({ tab }: { tab: Tab }) {
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: color.paper }, headerTintColor: color.carbon,
      headerTitleStyle: { fontFamily: font.bodyBold, fontSize: 17 }, contentStyle: { backgroundColor: color.paper } }}>
      {SCREENS.filter(s => s.tab === tab).map(s => (
        <Stack.Screen key={s.route} name={s.file.split('/').pop()!.replace(/\.tsx$/, '')} options={headerFor(s.route)} />
      ))}
    </Stack>
  );
}
