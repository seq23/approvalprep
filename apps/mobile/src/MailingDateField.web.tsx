import { dateInput, mailingDate } from './sentLetter';
import { color, space, tap, type } from './theme';
import type { MailingDateProps } from './MailingDateField';
export function MailingDateField({ value, onChange, disabled }: MailingDateProps) {
  return <label style={{ ...type.body, display: 'flex', flexDirection: 'column', gap: space[2] }}>
    Date mailed
    <input type="date" value={value} max={dateInput()} disabled={disabled} onChange={event => {
      const next = event.currentTarget.value;
      try { mailingDate(next); if (next <= dateInput()) onChange(next); } catch { /* Keep the last valid selection. */ }
    }} style={{ ...type.body, minHeight: tap, padding: space[3], color: color.carbon, background: color.paperRaised, border: `1px solid ${color.rule}` }} />
  </label>;
}
