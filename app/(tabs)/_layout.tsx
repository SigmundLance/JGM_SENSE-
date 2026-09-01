import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { Inter_400Regular, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { NotificationPreferenceProvider } from '../../context/NotificationPreferenceContext';
import { TemperatureProvider } from '../../context/TempContext';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

SplashScreen.preventAutoHideAsync();

function TabLayoutContent() {
  const { isDarkModeEnabled } = useTheme();
  const [fontsLoaded, error] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, error]);

  if (!fontsLoaded) return null;

  const isDarkMode = isDarkModeEnabled;
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const activeIconColor = isDarkMode ? '#FFC2CD' : '#F7A8B8';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeIconColor,
        tabBarInactiveTintColor: themeColors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          position: 'absolute',
          height: 75,
          borderTopWidth: 0,
          elevation: 5,
          shadowOpacity: 0,
        },
        headerShown: false,
        tabBarButton: (props) => <HapticTab {...props} />,
      }}
    >
      {/* Visible Tab Bar Items */}
      <Tabs.Screen
        name="LiveFeed"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="tv" color={color} />,
        }}
      />
      <Tabs.Screen
        name="GestationManagement"
        options={{
          title: 'Gestation',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="Temperature"
        options={{
          title: 'Temp',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="thermometer" color={color} />,
        }}
      />
      <Tabs.Screen
        name="Account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="person" color={color} />,
        }}
      />

      {/* Valid Screens inside app/(tabs) pushed to stack (hidden from bottom bar) */}
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="contact-us" options={{ href: null }} />
      <Tabs.Screen name="faq" options={{ href: null }} />
      <Tabs.Screen name="feedback" options={{ href: null }} />
      <Tabs.Screen name="privacy-policy" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="recovery-email" options={{ href: null }} />
      <Tabs.Screen name="ChangePassword" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="terms-and-conditions" options={{ href: null }} />
      <Tabs.Screen name="Report" options={{ href: null }} />
      <Tabs.Screen name="Notification" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <NotificationPreferenceProvider>
        <TemperatureProvider>
          <TabLayoutContent />
        </TemperatureProvider>
      </NotificationPreferenceProvider>
    </ThemeProvider>
  );
}