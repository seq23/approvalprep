import type { SavedLetter } from './letterStorage';
// @ts-ignore use the website's date calculation, never a second 30-day rule
import { answerDueDate } from '../../../src/lib/letterStudioCore.mjs';
export const MAIL_METHODS = ['Certified mail', 'First-class mail', 'Other mail'] as const;
export type MailMethod = typeof MAIL_METHODS[number];
export function dateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function mailingDate(value: string): Date {
  const date = new Date(`${value}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || dateInput(date) !== value) throw Error('Enter a real mailing date as YYYY-MM-DD.');
  return date;
}
export function reminderDate(mailedOn: string): Date {
  const due: Date = answerDueDate(mailingDate(mailedOn));
  due.setHours(9, 0, 0, 0);
  return due;
}
export interface SentDetails { date: string; method: MailMethod; tracking: string; remind: boolean }
export interface LocalReminders {
  permission(): Promise<boolean>;
  schedule(id: string, date: Date): Promise<void>;
  cancel(id: string): Promise<void>;
}
export const reminderId = (id: string) => `approvalprep-letter-${id}`;
/** Permission is requested only by this explicit save action, after ownership and input checks. */
export async function markSent(letter: SavedLetter, details: SentDetails, deps: {
  ownsKit(): Promise<boolean>;
  update(letter: SavedLetter): Promise<void>;
  reminders: LocalReminders;
}, now = new Date()) {
  if (!await deps.ownsKit()) throw Error('This feature is included in the Credit Letter Kit.');
  if (letter.status === 'answered') throw Error('This letter already has an answer recorded.');
  const sent = mailingDate(details.date);
  if (dateInput(sent) > dateInput(now)) throw Error('The mailing date cannot be in the future.');
  if (!MAIL_METHODS.includes(details.method)) throw Error('Choose how you mailed the letter.');
  const due = reminderDate(details.date);
  const identifier = reminderId(letter.id);
  // Cancel the previous date first; a failed cancellation must not leave a second reminder.
  await deps.reminders.cancel(identifier);
  let updated: SavedLetter = { ...letter, status: 'sent', sentDate: details.date, method: details.method,
    trackingNumber: details.tracking.trim() || null, reminderDate: null };
  await deps.update(updated);
  let reminder: 'scheduled' | 'off' | 'past' | 'denied' = 'off';
  if (details.remind && due > now) {
    if (await deps.reminders.permission()) {
      await deps.reminders.schedule(identifier, due);
      updated = { ...updated, reminderDate: dateInput(due) };
      try { await deps.update(updated); } catch (error) { await deps.reminders.cancel(identifier); throw error; }
      reminder = 'scheduled';
    } else reminder = 'denied';
  } else if (details.remind) reminder = 'past';
  return { letter: updated, reminder, due };
}

/** Deleting a letter or recording its answer also removes its scheduled notification. */
export function withReminderCleanup<T extends {
  update(letter: SavedLetter): Promise<void>;
  list(): Promise<SavedLetter[]>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
}>(store: T, reminders: Pick<LocalReminders, 'cancel'>): T {
  return { ...store,
    async update(letter: SavedLetter) {
      if (letter.status === 'answered') {
        await reminders.cancel(reminderId(letter.id));
        await store.update({ ...letter, reminderDate: null });
      } else await store.update(letter);
    },
    async remove(id: string) { await reminders.cancel(reminderId(id)); await store.remove(id); },
    async removeAll() {
      for (const letter of await store.list()) await reminders.cancel(reminderId(letter.id));
      await store.removeAll();
    },
  };
}
