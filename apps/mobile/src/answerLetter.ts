import type { SavedLetter } from './letterStorage';
import { dateInput, mailingDate, reminderId, type LocalReminders } from './sentLetter';
// @ts-ignore shared sourced website guidance
import { bureauAnswer } from '../../../src/lib/bureauAnswer.mjs';
export const ANSWER_CHOICES = [
  { value: 'Corrected', label: 'They corrected it', guidance: [bureauAnswer.corrected] },
  { value: 'Verified', label: 'They said it is verified', guidance: [bureauAnswer.verified, bureauAnswer.statement + '.', bureauAnswer.accurate] },
  { value: 'No answer', label: 'No answer yet', guidance: [bureauAnswer.received, bureauAnswer.check, bureauAnswer.write] },
] as const;
const GENERAL_ANSWER_CHOICES = [
  { value: 'Other answer', label: 'They answered', guidance: ['Keep their response with your letter and read what they have agreed to or asked for.'] },
  { value: 'No answer', label: 'No answer yet', guidance: ['Check your delivery record and the contact details for the recipient you wrote to.'] },
] as const;
export const isBureauLetter = (letter: SavedLetter) => letter.kind === 'bureau-dispute' || letter.kind === 'follow-up';
export const answerChoices = (letter: SavedLetter) => isBureauLetter(letter) ? ANSWER_CHOICES : GENERAL_ANSWER_CHOICES;
export type BureauAnswer = typeof ANSWER_CHOICES[number]['value'] | typeof GENERAL_ANSWER_CHOICES[number]['value'];
export const answerOffer = (hasKit: boolean, salesEnabled: boolean) => !hasKit && salesEnabled ? 'ap_credit_kit' : null;
export async function saveBureauAnswer(letter: SavedLetter, choice: BureauAnswer, arrivedOn: string, deps: {
  update(letter: SavedLetter): Promise<void>; reminders: Pick<LocalReminders, 'cancel'>;
}, now = new Date()) {
  if (!['sent', 'answered'].includes(letter.status) || !letter.sentDate || !answerChoices(letter).some(row => row.value === choice)) throw Error('Open a mailed letter and choose an answer.');
  if (arrivedOn && choice !== 'No answer') {
    mailingDate(arrivedOn);
    if (arrivedOn > dateInput(now) || arrivedOn < letter.sentDate) throw Error('Choose an answer date between the mailing date and today.');
  }
  const updated: SavedLetter = { ...letter, status: choice === 'No answer' ? 'sent' : 'answered', answerNote: choice,
    answeredAt: now.toISOString(), reminderDate: null,
    answers: { ...letter.answers, answerArrivedOn: choice === 'No answer' ? '' : arrivedOn } };
  await deps.reminders.cancel(reminderId(letter.id));
  await deps.update(updated);
  return updated;
}
