// Shared with the website; no paid template is imported into the Studio.
// @ts-ignore shared website module is JavaScript
import { studioSituations, buildLetter } from '../../../src/data/letterStudio';
// @ts-ignore shared website module is JavaScript
import { kitMoments } from '../../../src/lib/kitMoments.mjs';
import { LETTERS, EXPLANATION_LETTERS } from './letters';
export interface StudioField { name: string; label: string; hint?: string; kind?: string }
export interface StudioSituation { id: string; kind: string; label: string; fields: StudioField[]; recommendationSku: string; recommendationName: string }
export const situations: StudioSituation[] = studioSituations;
// Every kit the Studio recommends is sold in the app on its own (her ruling 13 Nov 2026, "Exact
// mirror"): the two letter kits on the kit screen, the other five as files on the files screen.
export function studioKitRoute(sku: string): { pathname: '/letters/unlock' | '/letters/files'; params: { kit: string } } {
  if (sku === 'credit-letter-kit') return { pathname: '/letters/unlock', params: { kit: 'credit-letter-kit' } };
  if (sku === 'letter-of-explanation') return { pathname: '/letters/unlock', params: { kit: 'letter-of-explanation-kit' } };
  return { pathname: '/letters/files', params: { kit: sku } };
}
// The two kits sold in the app hold fewer documents than the website kits of the same name, so
// their "what the kit adds" list is built from the app's own letters, never the website's list.
// The five file kits are the website's own files, so the website's list is true there.
const TRACKING = { when: 'After you mail a letter', items: ['Mark as sent, the day count and a reminder on day 30'] };
export function kitAdds(sku: string): { when: string; items: string[] }[] {
  if (sku === 'credit-letter-kit') return [{ when: 'Letters in this kit', items: LETTERS.filter(l => l.access === 'kit').map(l => l.name) }, TRACKING];
  if (sku === 'letter-of-explanation') return [{ when: 'Letters in this kit', items: EXPLANATION_LETTERS.map(l => l.name) }, TRACKING];
  return kitMoments[sku as keyof typeof kitMoments].moments;
}
export function studioDraft(id: string, answers: Record<string, string>, today = new Date()) {
  const situation = situations.find(s => s.id === id);
  if (!situation) throw Error('UNKNOWN_STUDIO_SITUATION');
  return { text: buildLetter(id, answers, { today }).text as string, actions: ['copy', 'share'] as const,
    kitName: situation.recommendationName,
    kitRoute: studioKitRoute(situation.recommendationSku),
    moments: kitAdds(situation.recommendationSku) };
}
