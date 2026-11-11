import type { LocalReminders } from './sentLetter';
// Hosted preview: saving sent details works; it never asks a browser for notification permission.
export const localReminders: LocalReminders = {
  async permission() { return false; },
  async schedule() { throw Error('Local reminders need the phone app.'); },
  async cancel() {},
};
