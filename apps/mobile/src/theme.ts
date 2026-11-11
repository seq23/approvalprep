// The approved ApprovalPrep design system (https://claude.ai/artifact/BKh2xEmgb1wAitJ9Tq9N4T, tokens.css).
// Every colour, size and space on a screen comes from here; no hex after this file.
export const color = {
  paper: '#F7F3EA', paperRaised: '#FFFDF8', carbon: '#1D1C21', carbonMuted: '#57534C', rule: '#D9D0BE',
  signal: '#FF7A3D', onSignal: '#1D1C21', signalDeep: '#9A3F12', highlighter: '#FFE066',
  stop: '#B42318', stopSoft: '#FBE9E5', done: '#2F6B3A', focus: '#1D1C21',
} as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;
export const radius = { sm: 4, md: 8 } as const;
export const font = {
  display: 'Archivo_800ExtraBold', body: 'AtkinsonHyperlegibleNext_400Regular',
  bodyBold: 'AtkinsonHyperlegibleNext_700Bold', mono: 'IBMPlexMono_500Medium',
} as const;
// Four reading sizes (21 / 18 / 16 / 15) plus sub 13 and label 12, as in tokens.css.
export const type = {
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 33, color: color.carbon },
  title: { fontFamily: font.display, fontSize: 21, lineHeight: 26, color: color.carbon },
  section: { fontFamily: font.display, fontSize: 18, lineHeight: 24, color: color.carbon },
  subhead: { fontFamily: font.bodyBold, fontSize: 16, lineHeight: 22, color: color.carbon },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.carbon },
  sub: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.carbonMuted },
  button: { fontFamily: font.bodyBold, fontSize: 16, lineHeight: 20 },
  label: { fontFamily: font.mono, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, color: color.carbonMuted, textTransform: 'uppercase' as const },
} as const;
export const tap = 48; // every button; links at least 44
