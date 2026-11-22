// The seasonal tips behind the In-App Events (store/events/in-app-events.json is the one source):
// each shows on its Studio situation only between the event's start and end, so the event is
// time-limited content the app really has (Apple's In-App Event rule).
import drafts from '../store/events/in-app-events.json';
const day = (iso: string, end = false) => new Date(`${iso}T${end ? '23:59:59' : '00:00:00'}`);
/** The tip for this situation on this date, or null outside every event window. */
export function seasonalTip(situation: string, now = new Date()): string | null {
  const e = drafts.events.find(x => x.studio_situation === situation && day(x.starts) <= now && now <= day(x.ends, true));
  return e?.in_app_tip ?? null;
}
