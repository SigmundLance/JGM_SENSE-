import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNotificationPreference } from '../../context/NotificationPreferenceContext';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkModeEnabled, toggleDarkMode, theme } = useTheme();
  const { isNotificationsEnabled, toggleNotifications } = useNotificationPreference();

  const [fontsLoaded] = useFonts({
    'SF-Pro-Regular': require('../../assets/images/fonts/SFPRODISPLAYREGULAR.otf'),
    'SF-Pro-Bold': require('../../assets/images/fonts/SFPRODISPLAYBOLD.otf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  // Dynamic Theme Colors
  const textColor = theme.text || (isDarkModeEnabled ? '#FFFFFF' : '#2D1F21');
  const cardBgColor = theme.cardBg || (isDarkModeEnabled ? '#1E1E1E' : '#FFFFFF');
  const sectionHeaderColor = isDarkModeEnabled ? '#A09095' : '#8A7B80';
  const subtitleColor = isDarkModeEnabled ? '#B0A0A5' : '#8C7C81';
  const dividerColor = isDarkModeEnabled ? '#2C2C2C' : '#F5EAEA';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || (isDarkModeEnabled ? '#121212' : '#FAF2F3') }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/Account')}
        >
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SECTION 1: PREFERENCES */}
        <Text style={[styles.sectionHeaderTitle, { color: sectionHeaderColor }]}>PREFERENCES</Text>
        <View style={[styles.cardGroup, { backgroundColor: cardBgColor }]}>
          {/* Notifications */}
          <TouchableOpacity
            style={[styles.itemRow, { borderBottomColor: dividerColor, borderBottomWidth: 1 }]}
            activeOpacity={0.8}
            onPress={toggleNotifications}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkModeEnabled ? '#3A2B1D' : '#FDF3E7' }]}>
                <Ionicons name="notifications" size={18} color="#D97B28" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.itemTitle, { color: textColor }]}>
                  Notifications
                </Text>
                <Text style={[styles.itemSubtitle, { color: subtitleColor }]}>Receive reminders and alerts.</Text>
              </View>
            </View>
            <Switch
              style={{ transform: [{ scale: 0.8 }] }}
              trackColor={{ false: isDarkModeEnabled ? '#444444' : '#E2D5D7', true: '#E07A8B' }}
              thumbColor={'#FFFFFF'}
              ios_backgroundColor={isDarkModeEnabled ? '#444444' : '#E2D5D7'}
              onValueChange={toggleNotifications}
              value={isNotificationsEnabled}
            />
          </TouchableOpacity>

          {/* Dark Mode */}
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.8}
            onPress={toggleDarkMode}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkModeEnabled ? '#3A321D' : '#FFF7E6' }]}>
                <Ionicons name="moon" size={18} color="#E5A100" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.itemTitle, { color: textColor }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.itemSubtitle, { color: subtitleColor }]}>Use a darker appearance.</Text>
              </View>
            </View>
            <Switch
              style={{ transform: [{ scale: 0.8 }] }}
              trackColor={{ false: isDarkModeEnabled ? '#444444' : '#E2D5D7', true: '#E07A8B' }}
              thumbColor={'#FFFFFF'}
              ios_backgroundColor={isDarkModeEnabled ? '#444444' : '#E2D5D7'}
              onValueChange={toggleDarkMode}
              value={isDarkModeEnabled}
            />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: SUPPORT & LEGAL */}
        <Text style={[styles.sectionHeaderTitle, { color: sectionHeaderColor }]}>SUPPORT & LEGAL</Text>
        <View style={[styles.cardGroup, { backgroundColor: cardBgColor }]}>
          {/* Privacy Policy */}
          <TouchableOpacity
            style={[styles.itemRow, { borderBottomColor: dividerColor, borderBottomWidth: 1 }]}
            onPress={() => router.push('/privacy-policy')}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkModeEnabled ? '#3A2027' : '#FDEAEF' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#E57373" />
              </View>
              <Text style={[styles.itemTitle, { color: textColor }]}>
                Privacy Policy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDarkModeEnabled ? '#666666' : '#C8B8BC'} />
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={[styles.itemRow, { borderBottomColor: dividerColor, borderBottomWidth: 1 }]}
            onPress={() => router.push('/terms-and-conditions')}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkModeEnabled ? '#2C1B33' : '#F3E8F9' }]}>
                <Ionicons name="document-text-outline" size={18} color="#8E24AA" />
              </View>
              <Text style={[styles.itemTitle, { color: textColor }]}>
                Terms & Conditions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDarkModeEnabled ? '#666666' : '#C8B8BC'} />
          </TouchableOpacity>

          {/* Contact Us */}
          <TouchableOpacity
            style={[styles.itemRow, { borderBottomColor: dividerColor, borderBottomWidth: 1 }]}
            onPress={() => router.push('/contact-us')}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkModeEnabled ? '#1E3324' : '#E4F4E9' }]}>
                <Ionicons name="headset-outline" size={18} color="#3B8754" />
              </View>
              <Text style={[styles.itemTitle, { color: textColor }]}>
                Contact Us
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDarkModeEnabled ? '#666666' : '#C8B8BC'} />
          </TouchableOpacity>

          {/* Feedback */}
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/feedback')}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkModeEnabled ? '#332422' : '#F7EBE8' }]}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color="#8C564B" />
              </View>
              <Text style={[styles.itemTitle, { color: textColor }]}>
                Feedback
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={isDarkModeEnabled ? '#666666' : '#C8B8BC'} />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: ACCOUNT */}
        <Text style={[styles.sectionHeaderTitle, { color: sectionHeaderColor }]}>ACCOUNT</Text>
        <View style={[styles.cardGroup, { backgroundColor: cardBgColor }]}>
          <TouchableOpacity style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkModeEnabled ? '#3A2027' : '#FDEAEF' }]}>
                <Ionicons name="trash-outline" size={18} color="#FF5252" />
              </View>
              <Text style={[styles.itemTitle, { color: '#FF5252' }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 15,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  sectionHeaderTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
  },
  itemSubtitle: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 12,
    marginTop: 2,
  },
});