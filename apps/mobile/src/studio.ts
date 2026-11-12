// Shared with the website; no paid template is imported into the Studio.
// @ts-ignore shared website module is JavaScript
import { studioSituations, buildLetter } from '../../../src/data/letterStudio';
// @ts-ignore shared website module is JavaScript
import { kitMoments } from '../../../src/lib/kitMoments.mjs';
export interface StudioField { name: string; label: string; hint?: string; kind?: string }
export interface StudioSituation { id: string; kind: string; label: string; fields: StudioField[]; recommendationSku: string; recommendationName: string }
export const situations: StudioSituation[] = studioSituations;
// Website-only guides are delivered by the complete bundle in the phone app.
export function studioKitRoute(sku: string) {
  if (sku === 'credit-letter-kit') return { pathname: '/letters/unlock' as const, params: { kit: 'credit-letter-kit' } };
  if (sku === 'letter-of-explanation') return { pathname: '/letters/unlock' as const, params: { kit: 'letter-of-explanation-kit' } };
  return { pathname: '/letters/bundle' as const };
}
export function studioDraft(id: string, answers: Record<string, string>, today = new Date()) {
  const situation = situations.find(s => s.id === id);
  if (!situation) throw Error('UNKNOWN_STUDIO_SITUATION');
  return { text: buildLetter(id, answers, { today }).text as string, actions: ['copy', 'share'] as const,
    kitName: situation.recommendationName,
    kitRoute: studioKitRoute(situation.recommendationSku),
    moments: kitMoments[situation.recommendationSku as keyof typeof kitMoments].moments as { when: string; items: string[] }[] };
}
