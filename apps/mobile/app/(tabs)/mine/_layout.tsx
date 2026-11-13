import { TabStack } from '../../../src/nav';
// The tab's own list is always the bottom of its stack, even when a screen in it was opened from
// another tab, so Back and the tab button both lead to the list.
export const unstable_settings = { initialRouteName: 'index' };
export default function Layout() { return <TabStack tab="mine" />; }
