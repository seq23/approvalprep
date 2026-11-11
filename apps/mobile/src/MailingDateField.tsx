import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from './ui';
import { type } from './theme';
import { dateInput, mailingDate } from './sentLetter';
import { showDate } from './myLetters';
export interface MailingDateProps { value: string; onChange(value: string): void; disabled?: boolean }
export function MailingDateField({ value, onChange, disabled }: MailingDateProps) {
  const [open, setOpen] = useState(false);
  return <View>
    <Text style={type.label}>Date mailed</Text>
    <Button label={showDate(mailingDate(value))} disabled={disabled} onPress={() => setOpen(true)} />
    {open ? <DateTimePicker value={mailingDate(value)} mode="date" maximumDate={new Date()} disabled={disabled}
      onChange={(event, selected) => {
        if (Platform.OS === 'android' || event.type === 'dismissed') setOpen(false);
        if (event.type === 'set' && selected && dateInput(selected) <= dateInput()) onChange(dateInput(selected));
      }} /> : null}
    {open && Platform.OS === 'ios' ? <Button label="Done" onPress={() => setOpen(false)} /> : null}
  </View>;
}
