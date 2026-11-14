import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, radius, space, tap, type } from './theme';
import { SELF_HELP_LINE } from './copy';
import { byRoute } from './screens';
import { useBackKeys } from './nav';
import { ssnInput } from './letterStorage';

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
  // A screen inside a tab's stack starts under that stack's header; Home and the not-found page have none.
  return spec.tab && spec.tab !== 'index' ? <View style={s.safe}>{body}</View> : <SafeAreaView style={s.safe} edges={['top']}>{body}</SafeAreaView>;
}

/** quiet: a text-weight link (Restore purchase, Terms, Privacy) so the one main button stays the last big thing. */
export function Button({ label, onPress, primary, quiet, disabled = false }: { label: string; onPress?: () => void; primary?: boolean; quiet?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || !onPress} accessibilityState={{ disabled: disabled || !onPress }}
      style={({ pressed }) => [s.btn, primary ? s.primary : quiet ? s.quiet : s.secondary, (disabled || !onPress) ? { opacity: 0.5 } : pressed && { opacity: 0.85 }]}>
      <Text style={[type.button, quiet ? { color: color.signalDeep, textDecorationLine: 'underline' } : { color: color.carbon }]}>{label}</Text>
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
  quiet: { borderColor: 'transparent', alignItems: 'flex-start', paddingHorizontal: 0 },
  card: { backgroundColor: color.paperRaised, borderColor: color.rule, borderWidth: 1, borderRadius: radius.md, padding: space[4] },
});

/** One action per row; the whole row is the accessible tap target. Pass `selected` only on a real
 * choice (bureau, mail method, answer): only those rows draw ○ / ●, so a plain list never looks like
 * one she must pick from (finding #16). */
export function Row({ title, sub, onPress, selected }: { title: string; sub?: string; onPress: () => void; selected?: boolean }) {
  const choice = selected !== undefined;
  return <Pressable accessibilityRole={choice ? 'radio' : 'button'} accessibilityState={choice ? { selected, checked: selected } : {}} onPress={onPress} style={{ minHeight: tap, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderColor: color.rule }}>
    {choice ? <Text accessibilityElementsHidden style={{ color: color.carbon }}>{selected ? '●' : '○'}</Text> : null}
    <View style={{ flex: 1 }}><Text style={type.subhead}>{title}</Text>{sub ? <Text style={type.sub}>{sub}</Text> : null}</View>
    <Text accessibilityElementsHidden style={{ color: color.carbon }}>›</Text>
  </Pressable>;
}

/** What kind of answer a box takes, so the phone shows the right keyboard and never "corrects" it. */
export type FieldKind = 'text' | 'email' | 'url' | 'ssn4';
const KEYBOARD = {
  text: {},
  email: { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email', autoCorrect: false, textContentType: 'emailAddress', spellCheck: false },
  url: { keyboardType: 'url', autoCapitalize: 'none', autoComplete: 'url', autoCorrect: false, textContentType: 'URL', spellCheck: false },
  ssn4: { keyboardType: 'number-pad', autoComplete: 'off', autoCorrect: false, textContentType: 'none', spellCheck: false },
} as const;
/** The keyboard settings for a kind of box (tests/ui.test.ts reads these). */
export const keyboardFor = (kind: FieldKind) => KEYBOARD[kind];
/** The phone's box owns the text (uncontrolled, `defaultValue`): the app never writes text back into
 * it while she types. A controlled `value` that re-renders on each key fights the native box on the
 * new architecture, and the native side then drops change events: the box shows "Jordan Avery" but
 * the app only heard "Jordan" (sim retest). The parent hears every change, and again on blur / end
 * of editing with the box's own text, so a change event the phone never sent is still saved before
 * Next. Only a genuinely new value from the parent (a cleared box, a reloaded draft) is put back,
 * by re-creating the box; the parent echoing something she typed earlier is never mistaken for one. */
export function Field({ label, value, onChangeText, defaultHint, multiline = false, spoken, email = false, kind = email ? 'email' : 'text' }: { label: string; value: string; onChangeText: (value: string) => void; defaultHint?: string; multiline?: boolean; spoken?: string; email?: boolean; kind?: FieldKind }) {
  const labelId = useId();
  // What the box holds now, as last reported by the phone (after the SSN mask).
  const typed = useRef(value);
  // Values handed up since the parent last caught up: an echo of one of these is not a new value.
  const handed = useRef(new Set<string>());
  // The text a re-created box starts with, and its key.
  const [box, setBox] = useState({ text: value, n: 0 });
  useEffect(() => {
    if (value === typed.current) { handed.current.clear(); return; }
    if (handed.current.has(value)) return;
    typed.current = value; handed.current.clear(); setBox(b => ({ text: value, n: b.n + 1 }));
  }, [value]);
  const hand = (next: string) => { if (next === typed.current) return; typed.current = next; handed.current.add(next); onChangeText(next); };
  const masked = (raw: string) => kind === 'ssn4' ? ssnInput(raw, typed.current) : raw;
  // The mask is applied to what the parent hears on every key, but written into the box only when
  // she leaves it, so it never fights the keys she is typing.
  const settle = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const next = masked(raw); hand(next);
    if (next !== raw) setBox(b => ({ text: next, n: b.n + 1 }));
  };
  return <View style={{ gap: space[2] }}>
    <Text nativeID={labelId} style={type.label}>{label}</Text>
    {defaultHint ? <Text style={type.sub}>{defaultHint}</Text> : null}
    <TextInput key={box.n} accessibilityLabel={spoken ?? label} accessibilityLabelledBy={labelId} defaultValue={box.text} onChangeText={raw => hand(masked(raw))}
      onEndEditing={e => settle(e?.nativeEvent?.text)} onBlur={e => settle((e?.nativeEvent as { text?: unknown } | undefined)?.text)}
      multiline={multiline} {...KEYBOARD[kind]} style={[type.body, { minHeight: tap, padding: space[3], borderWidth: 1, borderColor: color.rule, backgroundColor: color.paperRaised, borderRadius: radius.sm }]} />
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
