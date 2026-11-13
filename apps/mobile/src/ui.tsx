import { useEffect, useId, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, radius, space, tap, type } from './theme';
import { SELF_HELP_LINE } from './copy';
import { byRoute } from './screens';
import { useBackKeys } from './nav';

// Every screen is a <Screen>: paper ground, phone margin, and the R-ADV-13 self-help line last.
// The line cannot be switched off; tests/self-help.test.ts fails if a screen skips <Screen>.
// route: the screen's place in src/screens.ts. Inside a tab the stack header carries its
// name and "← Back" / "✕ Close" (src/nav.tsx), so the screen starts under it; Android back
// and Escape go back the same way.
export function Screen({ route, title, label, children }: { route: string; title: string; label?: string; children?: ReactNode }) {
  const spec = byRoute(route);
  useBackKeys(route);
  const body = (
    <ScrollView contentContainerStyle={s.body}>
      {label ? <Text style={type.label}>{label}</Text> : null}
      <Text style={type.title} accessibilityRole="header">{title}</Text>
      {children}
      <Text style={[type.sub, s.selfHelp]} testID="self-help-line">{SELF_HELP_LINE}</Text>
    </ScrollView>
  );
  return spec.tab ? <View style={s.safe}>{body}</View> : <SafeAreaView style={s.safe} edges={['top']}>{body}</SafeAreaView>;
}

export function Button({ label, onPress, primary, disabled = false }: { label: string; onPress?: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || !onPress} accessibilityState={{ disabled: disabled || !onPress }}
      style={({ pressed }) => [s.btn, primary ? s.primary : s.secondary, (disabled || !onPress) ? { opacity: 0.5 } : pressed && { opacity: 0.85 }]}>
      <Text style={[type.button, { color: color.carbon }]}>{label}</Text>
    </Pressable>
  );
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

/** One action per row; the whole row is the accessible tap target. */
export function Row({ title, sub, onPress, selected = false }: { title: string; sub?: string; onPress: () => void; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ minHeight: tap, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderColor: color.rule }}>
    <Text accessibilityElementsHidden style={{ color: color.carbon }}>{selected ? '●' : '○'}</Text>
    <View style={{ flex: 1 }}><Text style={type.subhead}>{title}</Text>{sub ? <Text style={type.sub}>{sub}</Text> : null}</View>
    <Text accessibilityElementsHidden style={{ color: color.carbon }}>›</Text>
  </Pressable>;
}

export function Field({ label, value, onChangeText, defaultHint, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; defaultHint?: string; multiline?: boolean }) {
  const labelId = useId();
  return <View style={{ gap: space[2] }}>
    <Text nativeID={labelId} style={type.label}>{label}</Text>
    {defaultHint ? <Text style={type.sub}>{defaultHint}</Text> : null}
    <TextInput accessibilityLabel={label} accessibilityLabelledBy={labelId} value={value} onChangeText={onChangeText} multiline={multiline} style={[type.body, { minHeight: tap, padding: space[3], borderWidth: 1, borderColor: color.rule, backgroundColor: color.paperRaised, borderRadius: radius.sm }]} />
  </View>;
}

export function Sheet({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: color.paperRaised, borderWidth: 1, borderColor: color.rule, borderRadius: radius.md, padding: space[4], gap: space[3] }}>{children}</View>;
}

/** The parent owns visibility; system Back, Escape and Close all dismiss the same sheet. */
export function BottomSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); onClose(); } };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [visible, onClose]);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}>
      <SafeAreaView edges={['bottom']} style={{ maxHeight: '90%', backgroundColor: color.paperRaised }} accessibilityViewIsModal>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space[4], gap: space[3] }}>
          <Button label="✕ Close" onPress={onClose} />
          <Text accessibilityRole="header" style={type.title}>{title}</Text>
          {children}
          <Text style={type.sub}>{SELF_HELP_LINE}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}

export function Tag({ children }: { children: ReactNode }) {
  return <Text style={[type.sub, { alignSelf: 'flex-start', backgroundColor: color.highlighter, paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.sm }]}>{children}</Text>;
}
