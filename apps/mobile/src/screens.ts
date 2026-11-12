// Every screen in the plan (docs/APP_PLAN.md, Screens) and how you move between them
// (make-it-calm section 7; the owner's tap-through of the sibling app, 6 Nov 2026: "i cant
// go back or back to home or esc"). The stack headers (src/nav.tsx) and <Screen> read this
// map, so Back, Close and the tab bar cannot be forgotten on one screen.
// tests/nav.test.ts checks the map: home in one tap, Back inside the tab, no orphans.
export type Kind = 'start' | 'tab' | 'sub' | 'sheet';
export type Tab = 'letters' | 'mine' | 'more';
export interface ScreenSpec {
  id: string; route: string; file: string; title: string; kind: Kind;
  tab?: Tab; back?: string; links: string[];
}
export const HOME = '/letters';
export const TABS: { tab: Tab; route: string; label: string }[] = [
  { tab: 'letters', route: '/letters', label: 'Write a letter' },
  { tab: 'mine', route: '/mine', label: 'My letters' },
  { tab: 'more', route: '/more', label: '☰ More' },
];
export const SCREENS: ScreenSpec[] = [
  { id: 'S1', route: '/', file: 'app/index.tsx', title: 'Start', kind: 'start', links: [HOME] },
  { id: 'S2', route: '/letters', file: 'app/(tabs)/letters/index.tsx', title: 'Write a letter', kind: 'tab', tab: 'letters', links: ['/letters/[kind]', '/letters/unlock', '/letters/studio'] },
  { id: 'Studio', route: '/letters/studio', file: 'app/(tabs)/letters/studio.tsx', title: 'Letter Studio', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/unlock', '/letters/bundle'] },
  { id: 'S3', route: '/letters/[kind]', file: 'app/(tabs)/letters/[kind].tsx', title: 'Questions', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/draft'] },
  { id: 'S4', route: '/letters/draft', file: 'app/(tabs)/letters/draft.tsx', title: 'Your letter', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/sent'] },
  { id: 'S5', route: '/letters/sent', file: 'app/(tabs)/letters/sent.tsx', title: 'Mark as sent', kind: 'sheet', tab: 'letters', back: '/letters/draft', links: [] },
  { id: 'S6', route: '/mine', file: 'app/(tabs)/mine/index.tsx', title: 'My letters', kind: 'tab', tab: 'mine', links: [] },
  { id: 'S7', route: '/letters/unlock', file: 'app/(tabs)/letters/unlock.tsx', title: 'Credit Letter Kit', kind: 'sub', tab: 'letters', back: '/letters', links: [] },
  { id: 'S8', route: '/more', file: 'app/(tabs)/more/index.tsx', title: 'More', kind: 'tab', tab: 'more', links: ['/letters/bundle'] },
  { id: 'Bundle', route: '/letters/bundle', file: 'app/(tabs)/letters/bundle.tsx', title: 'Complete ApprovalPrep Bundle', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/unlock'] },
];
export const byRoute = (route: string) => {
  const s = SCREENS.find(x => x.route === route);
  if (!s) throw new Error(`NAMED STOP [SCREEN_NOT_IN_PLAN] ${route}`);
  return s;
};
