import { Planned, Screen } from '../../src/ui';
// S4 Your letter: the sheet, the wrong line highlighted, Save as PDF / Share or print. Plan: screen S4.
export default function Draft() {
  return <Screen label="Your letter, first draft" title="Read it, then send it yourself"><Planned what="the letter sheet and PDF (task 5)" /></Screen>;
}
