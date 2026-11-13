// Every screen in the plan (docs/APP_PLAN.md, Screens) and how you move between them
// (make-it-calm section 7; the owner's tap-through of the sibling app, 6 Nov 2026: "i cant
// go back or back to home or esc"). The stack headers (src/nav.tsx) and <Screen> read this
// map, so Back, Close and the tab bar cannot be forgotten on one screen.
// tests/nav.test.ts checks the map: home in one tap, Back inside the tab, no orphans.
export type Kind = 'start' | 'tab' | 'sub' | 'sheet';
export type Tab = 'index' | 'letters' | 'mine' | 'more';
export interface ScreenSpec {
  id: string; route: string; file: string; title: string; kind: Kind;
  tab?: Tab; back?: string; links: string[];
}
export const HOME = '/letters';
// The first screen is a tab, so it can always be reached again and never stands without the tab bar.
export const FIRST = '/';
export const TABS: { tab: Tab; route: string; label: string }[] = [
  { tab: 'index', route: FIRST, label: 'Home' },
  { tab: 'letters', route: '/letters', label: 'Write a letter' },
  { tab: 'mine', route: '/mine', label: 'My letters' },
  { tab: 'more', route: '/more', label: '☰ More' },
];
export const SCREENS: ScreenSpec[] = [
  { id: 'S1', route: '/', file: 'app/(tabs)/index.tsx', title: 'Home', kind: 'tab', tab: 'index', links: ['/letters/studio', '/letters/[kind]', '/letters/unlock', '/letters/bundle', '/mine'] },
  { id: 'Lost', route: '/+not-found', file: 'app/+not-found.tsx', title: 'Page not found', kind: 'start', links: [FIRST, HOME] },
  { id: 'S2', route: '/letters', file: 'app/(tabs)/letters/index.tsx', title: 'Write a letter', kind: 'tab', tab: 'letters', links: ['/letters/[kind]', '/letters/unlock', '/letters/studio', '/letters/bundle'] },
  { id: 'Studio', route: '/letters/studio', file: 'app/(tabs)/letters/studio.tsx', title: 'Letter Studio', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/unlock', '/letters/bundle', '/mine'] },
  { id: 'S3', route: '/letters/[kind]', file: 'app/(tabs)/letters/[kind].tsx', title: 'Questions', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/draft'] },
  { id: 'S4', route: '/letters/draft', file: 'app/(tabs)/letters/draft.tsx', title: 'Your letter', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/sent'] },
  { id: 'S5', route: '/letters/sent', file: 'app/(tabs)/letters/sent.tsx', title: 'Mark as sent', kind: 'sheet', tab: 'letters', back: '/letters/draft', links: [] },
  { id: 'S6', route: '/mine', file: 'app/(tabs)/mine/index.tsx', title: 'My letters', kind: 'tab', tab: 'mine', links: ['/mine/answer', '/letters/draft'] }, // drafts open through draftHref (src/studioDrafts.ts)
  { id: 'Answer', route: '/mine/answer', file: 'app/(tabs)/mine/answer.tsx', title: 'What did they answer?', kind: 'sub', tab: 'mine', back: '/mine', links: ['/letters/unlock'] },
  { id: 'S7', route: '/letters/unlock', file: 'app/(tabs)/letters/unlock.tsx', title: 'Credit Letter Kit', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/bundle', '/letters/unlock'] },
  { id: 'S8', route: '/more', file: 'app/(tabs)/more/index.tsx', title: 'More', kind: 'tab', tab: 'more', links: ['/letters/bundle', '/letters/unlock'] },
  { id: 'Bundle', route: '/letters/bundle', file: 'app/(tabs)/letters/bundle.tsx', title: 'Complete ApprovalPrep Bundle', kind: 'sub', tab: 'letters', back: '/letters', links: ['/letters/unlock'] },
];
export const byRoute = (route: string) => {
  const s = SCREENS.find(x => x.route === route);
  if (!s) throw new Error(`NAMED STOP [SCREEN_NOT_IN_PLAN] ${route}`);
  return s;
};

// Where Back goes. A screen opened from another tab (a kit opened from More, a letter opened from
// My letters, the Studio opened from Home) is handed `from`, the tab she was on, and Back returns
// there. Only a tab's own root counts: anything else falls back to the screen's parent in the map.
export function backTarget(route: string, from?: string | string[]): string {
  const s = byRoute(route);
  const asked = Array.isArray(from) ? from[0] : from;
  if (asked && TABS.some(t => t.route === asked) && asked !== s.back) return asked;
  return s.back ?? HOME;
}

// The screen an address shows. An exact route wins over a pattern ("/letters/draft" is not a
// "/letters/[kind]"); an address in no plan is the not-found page, never a crash.
export function screenForPath(pathname: string): ScreenSpec {
  const path = pathname.replace(/\/+$/, '') || '/';
  return SCREENS.find(s => s.route === path)
    ?? SCREENS.find(s => s.route.includes('[') && new RegExp(`^${s.route.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(path))
    ?? byRoute('/+not-found');
}

// The name in the header. The kit screen shows the name of the kit it is selling.
export function titleFor(route: string, params?: Record<string, unknown>): string {
  if (route === '/letters/unlock') return params?.kit === 'letter-of-explanation-kit' ? 'Letter of Explanation Kit' : 'Credit Letter Kit';
  return byRoute(route).title;
}
