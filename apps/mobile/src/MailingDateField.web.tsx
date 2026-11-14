import { dateInput, mailingDate } from './sentLetter';
import { color, space, tap, type } from './theme';
import type { MailingDateProps } from './MailingDateField';
// DOM styles read a bare lineHeight number as a multiple of the font size (23 → 23em), so web needs px.
const body = { ...type.body, lineHeight: `${type.body.lineHeight}px` };
export function MailingDateField({ value, onChange, disabled, label = 'Date mailed' }: MailingDateProps) {
  return <label style={{ ...body, display: 'flex', flexDirection: 'column', gap: space[2] }}>
    {label}
    <input type="date" value={value} max={dateInput()} disabled={disabled} onChange={event => {
      const next = event.currentTarget.value;
      try { mailingDate(next); if (next <= dateInput()) onChange(next); } catch { /* Keep the last valid selection. */ }
    }} style={{ ...body, minHeight: tap, boxSizing: 'border-box', padding: space[3], color: color.carbon, background: color.paperRaised, border: `1px solid ${color.rule}` }} />
  </label>;
}
