import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, radius, space, tap, type } from './theme';
import { SELF_HELP_LINE } from './copy';

// Every screen is a <Screen>: paper ground, phone margin, and the R-ADV-13 self-help line last.
// The line cannot be switched off; tests/self-help.test.ts fails if a screen skips <Screen>.
export function Screen({ title, label, children }: { title: string; label?: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body}>
        {label ? <Text style={type.label}>{label}</Text> : null}
        <Text style={type.title} accessibilityRole="header">{title}</Text>
        {children}
        <Text style={[type.sub, s.selfHelp]} testID="self-help-line">{SELF_HELP_LINE}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Button({ label, onPress, primary }: { label: string; onPress?: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [s.btn, primary ? s.primary : s.secondary, pressed && { opacity: 0.85 }]}>
      <Text style={[type.button, { color: color.carbon }]}>{label}</Text>
    </Pressable>
  );
}

// A screen not built yet says so in plain words (docs/APP_PLAN.md task list builds it).
export function Planned({ what }: { what: string }) {
  return <View style={s.card}><Text style={type.sub}>Planned: {what}</Text></View>;
}

export function Hl({ children }: { children: ReactNode }) {
  return <Text style={{ backgroundColor: color.highlighter }}>{children}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  body: { padding: space[4], gap: space[4], paddingBottom: space[7] },
  selfHelp: { borderTopWidth: 1, borderTopColor: color.rule, paddingTop: space[3], marginTop: space[5] },
  btn: { minHeight: tap, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[5] },
  primary: { backgroundColor: color.signal, borderColor: color.signal },
  secondary: { backgroundColor: color.paperRaised, borderColor: color.carbon },
  card: { backgroundColor: color.paperRaised, borderColor: color.rule, borderWidth: 1, borderRadius: radius.md, padding: space[4] },
});
