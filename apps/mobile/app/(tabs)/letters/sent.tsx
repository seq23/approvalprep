import { Planned, Screen } from '../../../src/ui';
// S5 Mark as sent: date, how it was sent, optional tracking number, reminder. Plan: screen S5.
export default function Sent() {
  return <Screen route="/letters/sent" label="Mark as sent" title="When did you send it?"><Planned what="the sent date and reminder (task 6)" /></Screen>;
}
