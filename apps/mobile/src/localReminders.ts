import { Platform } from 'react-native';
import * as notifications from 'expo-notifications';
import type { LocalReminders } from './sentLetter';
const CHANNEL = 'letter-dates';
// No push tokens, server or letter details on the lock screen. No permission prompt on load.
notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
}) });
export const localReminders: LocalReminders = {
  async permission() {
    if (Platform.OS === 'android') await notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Letter dates', importance: notifications.AndroidImportance.DEFAULT,
    });
    const current = await notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await notifications.requestPermissionsAsync()).granted;
  },
  async schedule(identifier, date) {
    await notifications.scheduleNotificationAsync({ identifier,
      content: { title: 'Your letter date', body: 'Open ApprovalPrep to check the date you saved.', sound: 'default' },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  },
  async cancel(identifier) {
    await notifications.cancelScheduledNotificationAsync(identifier);
  },
};
