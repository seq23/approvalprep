import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDispute } from '../src/letterQuestions';
import { dateInput, mailingDate, markSent, reminderDate, reminderId, withReminderCleanup, type LocalReminders, type SentDetails } from '../src/sentLetter';
import { myLetters } from '../src/myLetters';
import type { SavedLetter } from '../src/letterStorage';

const now = new Date(2026, 10, 11, 12);
const details: SentDetails = { date: '2026-11-06', method: 'Certified mail', tracking: '  12345  ', remind: true };
function harness(owned = true, allowed = true) {
  let stored = newDispute('one');
  let permissions = 0;
  const scheduled = new Map<string, Date>();
  const cancelled: string[] = [];
  const reminders: LocalReminders = {
    async permission() { permissions++; return allowed; },
    async schedule(id, date) { scheduled.set(id, date); },
    async cancel(id) { cancelled.push(id); scheduled.delete(id); },
  };
  const deps = { ownsKit: async () => owned, reminders, update: async (letter: SavedLetter) => { stored = letter; } };
  return { deps, scheduled, cancelled, read: () => stored, permissions: () => permissions };
}

test('day 30 uses calendar days across months and DST; the list uses the same day count', () => {
  const due = reminderDate('2026-11-06');
  assert.equal(dateInput(due), '2026-12-06');
  assert.equal(due.getDay(), 0);
  assert.equal(due.getHours(), 9);
  assert.equal(dateInput(reminderDate('2026-10-15')), '2026-11-14');
  assert.equal(dateInput(reminderDate('2028-02-01')), '2028-03-02');
  const sent = { ...newDispute('one'), status: 'sent' as const, sentDate: '2026-11-06' };
  assert.match(myLetters([sent], true, new Date(2026, 10, 7)).rows[0].sub, /29 days/);
  for (const invalid of ['2026-02-30', '2026-13-01', '2026-11-31', '11/06/2026', '']) assert.throws(() => mailingDate(invalid));
});

test('saving sent details schedules once, persists the date, and changing dates replaces the reminder', async () => {
  const h = harness();
  let result = await markSent(h.read(), details, h.deps, now);
  assert.equal(result.reminder, 'scheduled');
  assert.equal(h.read().status, 'sent');
  assert.equal(h.read().trackingNumber, '12345');
  assert.equal(h.read().method, 'Certified mail');
  assert.equal(h.read().reminderDate, '2026-12-06');
  result = await markSent(h.read(), { ...details, date: '2026-11-10' }, h.deps, now);
  assert.equal(h.scheduled.size, 1);
  assert.equal(dateInput(h.scheduled.get(reminderId('one'))!), '2026-12-10');
  assert.equal(h.cancelled.length, 2);
  await markSent(h.read(), { ...details, remind: false }, h.deps, now);
  assert.equal(h.scheduled.size, 0);
  assert.equal(h.read().reminderDate, null);
});

test('no ownership, invalid input, denied permission and past dates never schedule a notification', async () => {
  const locked = harness(false);
  await assert.rejects(markSent(locked.read(), details, locked.deps, now));
  assert.equal(locked.read().status, 'draft');
  assert.equal(locked.permissions(), 0);
  assert.equal(locked.cancelled.length, 0);
  const invalid = harness();
  for (const date of ['2026-02-30', '2026-11-12']) await assert.rejects(markSent(invalid.read(), { ...details, date }, invalid.deps, now));
  assert.equal(invalid.permissions(), 0);
  assert.equal(invalid.read().status, 'draft');
  const denied = harness(true, false);
  assert.equal((await markSent(denied.read(), details, denied.deps, now)).reminder, 'denied');
  assert.equal(denied.scheduled.size, 0);
  assert.equal(denied.read().status, 'sent');
  assert.equal(denied.read().reminderDate, null);
  const past = harness();
  assert.equal((await markSent(past.read(), { ...details, date: '2026-09-01' }, past.deps, now)).reminder, 'past');
  assert.equal(past.permissions(), 0);
  assert.equal(past.scheduled.size, 0);
  const off = harness();
  await markSent(off.read(), { ...details, remind: false }, off.deps, now);
  assert.equal(off.permissions(), 0);
});

test('failed notification or persistence does not claim a saved reminder', async () => {
  const h = harness();
  h.deps.reminders.schedule = async () => { throw Error('schedule failed'); };
  await assert.rejects(markSent(h.read(), details, h.deps, now));
  assert.equal(h.read().status, 'sent');
  assert.equal(h.read().reminderDate, null);
  const rollback = harness();
  rollback.deps.update = async value => { if (value.reminderDate) throw Error('disk full'); };
  await assert.rejects(markSent(rollback.read(), details, rollback.deps, now));
  assert.equal(rollback.scheduled.size, 0);
});

test('failed sent-details save restores the existing reminder and preserves the stored letter', async () => {
  const h = harness();
  await markSent(h.read(), details, h.deps, now);
  const previous = h.read();
  const failure = Error('disk full');
  h.deps.update = async () => { throw failure; };
  await assert.rejects(markSent(previous, { ...details, date: '2026-11-10' }, h.deps, now), error => error === failure);
  assert.deepEqual(h.read(), previous);
  assert.equal(h.scheduled.size, 1);
  const restored = h.scheduled.get(reminderId(previous.id))!;
  assert.equal(dateInput(restored), previous.reminderDate);
  assert.equal(restored.getHours(), 9);
  assert.equal(h.permissions(), 1);
});

test('answering, deleting and deleting all letters cancel their reminders before changing storage', async () => {
  const h = harness();
  let letters = [{ ...newDispute('one'), status: 'sent' as SavedLetter['status'], reminderDate: '2026-12-06' }, newDispute('two')];
  const store = withReminderCleanup({
    async list() { return letters; },
    async update(value: SavedLetter) { assert.ok(h.cancelled.includes(reminderId(value.id))); letters = letters.map(l => l.id === value.id ? value : l); },
    async remove(id: string) { assert.ok(h.cancelled.includes(reminderId(id))); letters = letters.filter(l => l.id !== id); },
    async removeAll() { for (const l of letters) assert.ok(h.cancelled.includes(reminderId(l.id))); letters = []; },
  }, h.deps.reminders);
  await store.update({ ...letters[0], status: 'answered' });
  assert.equal(letters[0].reminderDate, null);
  await store.remove('one');
  await store.removeAll();
  assert.deepEqual(letters, []);
});
