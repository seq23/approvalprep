import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { color } from '../src/theme';
import { noteAppOpened } from '../src/askForRating';

SplashScreen.preventAutoHideAsync().catch(() => {});
export default function Layout() {
  const [loaded, error] = useFonts({ Archivo_800ExtraBold, AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_700Bold, IBMPlexMono_500Medium });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  // The rating ask waits a day from the first open (src/ratingPrompt.ts); the web preview never asks.
  useEffect(() => { if (Platform.OS !== 'web') void noteAppOpened(); }, []);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, ...(Platform.OS === 'web' ? { width: '100%' as const, maxWidth: 430, alignSelf: 'center' as const } : {}) }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }} />
    </View>
    </SafeAreaProvider>
  );
}
