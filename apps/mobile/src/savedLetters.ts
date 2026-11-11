import { openDatabaseAsync } from 'expo-sqlite';
import { letterStorage } from './letterStorage';
import { withReminderCleanup } from './sentLetter';
import { localReminders } from './localReminders';
let opening: ReturnType<typeof letterStorage> | undefined;
// Open only on first use; drafts remain on this phone and work offline.
export function savedLetters() {
  if (!opening) opening = openDatabaseAsync('approvalprep-letters.db').then(letterStorage).then(store => withReminderCleanup(store, localReminders)).catch(error => { opening = undefined; throw error; });
  return opening;
}
