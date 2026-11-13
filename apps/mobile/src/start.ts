import type { SavedLetter } from './letterStorage';
import { dueDate, myLetters, showDate } from './myLetters';
// Start screen, plan pattern (e): someone with saved letters opens on her own work (the next
// answer date, then her latest letters); someone with none sees only the way to write the first.
export function startModel(letters: SavedLetter[], hasKit: boolean, today = new Date()) {
  const model = myLetters(letters, hasKit, today);
  const waiting = model.rows
    .map(row => ({ row, due: row.letter.status === 'sent' ? dueDate(row.letter) : null }))
    .filter((item): item is { row: typeof model.rows[number]; due: Date } => !!item.due)
    .sort((a, b) => a.due.getTime() - b.due.getTime());
  return {
    returning: letters.length > 0,
    summary: model.summary,
    next: waiting.length ? { id: waiting[0].row.letter.id, title: waiting[0].row.title, date: showDate(waiting[0].due) } : null,
    recent: model.rows.slice(-3).reverse(),
  };
}
