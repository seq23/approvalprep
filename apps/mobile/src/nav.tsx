import React, { useEffect } from 'react';
import { BackHandler, Platform, Pressable, Text } from 'react-native';
import { router, useIsFocused, useLocalSearchParams, usePathname, type Href } from 'expo-router';
import { Stack } from 'expo-router';
import { color, font, type } from './theme';
import { SCREENS, backTarget, byRoute, screenForPath, titleFor, type Tab } from './screens';

// One way back from every screen: "← Back" (or "✕ Close" on a sheet), Android back and
// Escape all go to the previous screen, or to the screen's parent in the map if it was
// opened straight from a link, never out of the app.
export function goBack(route: string, from?: string | string[]) {
  const target = backTarget(route, from);
  if (target !== byRoute(route).back) {
    // Opened from another tab: leave this tab's stack as it was found, then return to that tab.
    if (router.canGoBack()) router.back();
    router.navigate(target as Href);
  } else if (router.canGoBack()) router.back();
  else router.replace(target as Href);
}

/** Open a screen in another tab and remember the tab she came from, so Back returns there. */
export function openFrom(from: string, pathname: string, params: Record<string, string> = {}) {
  router.push({ pathname, params: { ...params, from } } as Href);
}

function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label.replace(/[←✕]\s*/, '')} onPress={onPress} hitSlop={8}
      style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', paddingRight: 12 }}>
      <Text style={[type.button, { color: color.carbon }]}>{label}</Text>
    </Pressable>
  );
}

export function headerFor(route: string, params?: Record<string, unknown>) {
  const s = byRoute(route);
  const from = typeof params?.from === 'string' ? params.from : undefined;
  return {
    title: titleFor(route, params),
    headerBackVisible: false,
    headerLeft: () => (s.back ? <HeaderButton label={s.kind === 'sheet' ? '✕ Close' : '← Back'} onPress={() => goBack(route, from)} /> : null),
  };
}

export function useBackKeys(route: string) {
  const s = byRoute(route);
  const { from } = useLocalSearchParams<{ from?: string }>();
  // Screens under this one stay mounted. Only the screen on show answers Escape or Android back,
  // so one press goes back one screen ("Mark as sent" used to jump two). The path alone is not
  // enough: the Studio pushes one copy of the same route per question, and every copy matched the
  // path, so one Escape fired once per copy and jumped from question 2 straight to Home. Only the
  // focused copy listens.
  const focused = useIsFocused();
  const showing = focused && screenForPath(usePathname()).route === route;
  useEffect(() => {
    if (!s.back || !showing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(route, from); return true; });
    let off = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') goBack(route, from); };
      document.addEventListener('keydown', onKey);
      off = () => document.removeEventListener('keydown', onKey);
    }
    return () => { sub.remove(); off(); };
  }, [route, s.back, showing, from]);
}

// One stack per tab: sub-screens and sheets keep the tab bar under them, Back stays inside
// the tab, and tapping the tab you are on pops back to its root.
export function TabStack({ tab }: { tab: Tab }) {
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: color.paper }, headerTintColor: color.carbon,
      headerTitleStyle: { fontFamily: font.bodyBold, fontSize: 17 }, contentStyle: { backgroundColor: color.paper } }}>
      {SCREENS.filter(s => s.tab === tab).map(s => (
        <Stack.Screen key={s.route} name={s.file.split('/').pop()!.replace(/\.tsx$/, '')} options={({ route }) => headerFor(s.route, route.params as Record<string, unknown> | undefined)} />
      ))}
    </Stack>
  );
}
