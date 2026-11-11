import { openDatabaseAsync } from 'expo-sqlite';
import { createLetterStore, type LetterStore } from './letterStore';
let store: Promise<LetterStore> | undefined;
// Lazy initialization also lets Expo export static preview routes without opening a database.
export function lettersOnPhone(): Promise<LetterStore> {
  if (!store) {
    store = openDatabaseAsync('approvalprep-letters.db').then(createLetterStore).catch(error => {
      store = undefined;
      throw error;
    });
  }
  return store;
}
