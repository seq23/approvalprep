import { openDatabaseAsync } from 'expo-sqlite';
import { letterStorage } from './letterStorage';
let opening: ReturnType<typeof letterStorage> | undefined;
// Open only on first use; drafts remain on this phone and work offline.
export function savedLetters() {
  if (!opening) opening = openDatabaseAsync('approvalprep-letters.db').then(letterStorage).catch(error => { opening = undefined; throw error; });
  return opening;
}
