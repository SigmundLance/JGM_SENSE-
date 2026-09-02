import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import LoadingScreen from '../components/LoadingScreen';
import { auth } from '../firebaseConfig';

// 1. Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Prevent the splash screen from auto-hiding until we clear it
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isLoggedIn = false;

  // States to manage Oinky's custom loading lifecycle
  const [isNativeReady, setIsNativeReady] = useState(false);
  const [isCustomLoading, setIsCustomLoading] = useState(true);
  const [hasNavigated, setHasNavigated] = useState(false);

  // One-shot cleanup for accounts left with a stale local photoURI from
  // before profile photos were uploaded to Storage (that file:// / cache
  // path can never resolve once the app container is recreated). Uses
  // onAuthStateChanged rather than reading auth.currentUser directly,
  // since the persisted session restores asynchronously and may not be
  // populated yet on the first render.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user?.photoURL && !user.photoURL.startsWith('https://')) {
        updateProfile(user, { photoURL: null }).catch((error) => {
          console.error('Failed to clear stale photoURL:', error);
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const initApp = async () => {
      // 2. Request Notification Permissions on Startup
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted!');
      }

      // Android requires a channel or notifications silently fail.
      // HIGH (not DEFAULT) is required for a heads-up banner - DEFAULT
      // only lands quietly in the notification shade.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });

        // Separate channel so only override notifications get the Oink
        // sound - channel sound is fixed per-channel on Android, so
        // reusing 'default' here would make status alerts play it too.
        await Notifications.setNotificationChannelAsync('override', {
          name: 'Target Overrides',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'OinkNotifications.wav',
        });
      }

      // Hide native splash screen so Oinky can display
      await SplashScreen.hideAsync();
      setIsNativeReady(true);
    };

    initApp();
  }, []);

  const handleLoadingComplete = () => {
    setIsCustomLoading(false);
  };

  useEffect(() => {
    if (!isCustomLoading && !hasNavigated) {
      setHasNavigated(true);

      if (!isLoggedIn) {
        router.replace('/(auth)');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [isCustomLoading, hasNavigated, isLoggedIn, router]);

  // Block rendering until native splash is hidden
  if (!isNativeReady) {
    return null;
  }

  // Render Oinky loading screen
  if (isCustomLoading) {
    return <LoadingScreen onLayoutComplete={handleLoadingComplete} />;
  }

  // Render main app navigation
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}