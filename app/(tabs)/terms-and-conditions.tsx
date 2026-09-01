import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface TermItem {
  id: string;
  title: string;
  content: string;
  iconName: string;
  iconType: 'ionicons' | 'material';
}

// --- TERMS AND CONDITIONS DATA ---
const termsData: TermItem[] = [
  {
    id: '1',
    title: '1. Acceptance of Terms',
    content:
      'By registering and using the JGM-Sense application and its connected IoT hardware (ESP32 microcontrollers, DHT22 sensors, and ESP32-CAM), you agree to these Terms and Conditions. If you do not agree, please do not use the system.',
    iconName: 'checkbox-outline',
    iconType: 'ionicons',
  },
  {
    id: '2',
    title: '2. Purpose of the System',
    content:
      'JGM-Sense is designed to assist farm owners and livestock managers in monitoring sow farrowing and managing piglet brooding temperatures. It provides remote observation and automated thermal triggers. It is intended to be a supplementary tool, not a complete replacement for physical farm management, human oversight, or professional veterinary care.',
    iconName: 'target',
    iconType: 'material',
  },
  {
    id: '3',
    title: '3. Hardware & Connectivity Dependency',
    content:
      'The real-time accuracy of JGM-Sense depends entirely on your local infrastructure. We are not responsible for delayed notifications, missing video feeds, or failed heat lamp automation caused by local power outages, internet connectivity drops, or hardware degradation in the pen environment.',
    iconName: 'wifi',
    iconType: 'ionicons',
  },
  {
    id: '4',
    title: '4. Limitation of Liability',
    content:
      'Due to the unpredictable nature of livestock farrowing and hardware dependencies, JGM-Sense and its developers shall not be held liable for any loss of livestock, pre-weaning mortality, or damages to property (e.g., relay or heat lamp malfunctions). The farmer assumes all risks associated with animal welfare.',
    iconName: 'shield-outline',
    iconType: 'ionicons',
  },
  {
    id: '5',
    title: '5. Data & Privacy',
    content:
      'The system streams live video and collects environmental data (temperature/humidity logs) strictly for your dashboard viewing and automated triggers. We do not distribute your live camera feeds to third parties. Please refer to our Privacy Policy for full details.',
    iconName: 'lock-closed-outline',
    iconType: 'ionicons',
  },
  {
    id: '6',
    title: '6. User Responsibilities',
    content:
      'You are responsible for keeping your account credentials secure, ensuring the DHT22 sensors are placed safely away from physical damage by livestock, and verifying that all 5V relays and heat lamps are wired by a qualified technician to prevent fire hazards.',
    iconName: 'person-outline',
    iconType: 'ionicons',
  },
];

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const { isDarkModeEnabled, theme } = useTheme();

  // Changed to an array so multiple sections can be open at once
  const [openSectionIds, setOpenSectionIds] = useState<string[]>([]);

  // RESET FUNCTIONALITY: Closes all expanded sections whenever navigating away and returning
  useFocusEffect(
    useCallback(() => {
      setOpenSectionIds([]);
    }, [])
  );

  // Toggle individual card without closing others
  const toggleSection = (id: string) => {
    if (openSectionIds.includes(id)) {
      setOpenSectionIds(openSectionIds.filter((item) => item !== id));
    } else {
      setOpenSectionIds([...openSectionIds, id]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FCF3F5' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.sectionBg || '#FFFFFF' }]}
          onPress={() => router.replace('/settings')}
        >
          <Ionicons name="chevron-back" size={26} color={theme.icon || '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerText || '#111111' }]}>
          Terms & Conditions
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Subtitle / Last Updated */}
        <Text style={[styles.lastUpdatedText, { color: isDarkModeEnabled ? '#AAA' : '#8E8E93' }]}>
          Last Updated: May 2026
        </Text>
        <Text style={[styles.introText, { color: isDarkModeEnabled ? '#DDD' : '#3A3A3C' }]}>
          Please read these terms carefully before using the JGM-Sense IoT System and Mobile Application.
        </Text>

        {/* Accordion List */}
        {termsData.map((item) => {
          const isExpanded = openSectionIds.includes(item.id);

          return (
            <View
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: theme.sectionBg || '#FFFFFF' },
              ]}
            >
              <TouchableOpacity
                style={styles.cardHeader}
                activeOpacity={0.7}
                onPress={() => toggleSection(item.id)}
              >
                {/* Left Icon Badge */}
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: isDarkModeEnabled ? '#3A282B' : '#FDECF0' },
                  ]}
                >
                  {item.iconType === 'ionicons' ? (
                    <Ionicons
                      name={item.iconName as any}
                      size={18}
                      color={isDarkModeEnabled ? '#FFB4C2' : '#C0536A'}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={item.iconName as any}
                      size={18}
                      color={isDarkModeEnabled ? '#FFB4C2' : '#C0536A'}
                    />
                  )}
                </View>

                {/* Section Title */}
                <Text style={[styles.cardTitle, { color: theme.headerText || '#1A1A1A' }]}>
                  {item.title}
                </Text>

                {/* Expand Chevron Icon */}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={isDarkModeEnabled ? '#AAA' : '#8E8E93'}
                />
              </TouchableOpacity>

              {/* Accordion Content Body */}
              {isExpanded && (
                <View
                  style={[
                    styles.cardBody,
                    {
                      backgroundColor: isDarkModeEnabled ? '#2C2C2E' : '#FDECF0',
                      borderTopColor: isDarkModeEnabled ? '#3A3A3C' : 'rgba(0,0,0,0.03)',
                    },
                  ]}
                >
                  <Text style={[styles.cardContentText, { color: isDarkModeEnabled ? '#E5E5EA' : '#4A4A4A' }]}>
                    {item.content}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Footer Note */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDarkModeEnabled ? '#777' : '#999' }]}>
            JGM-Sense: Precision Livestock Farming
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ==========================================
  // 1. CONTAINER & HEADER
  // ==========================================
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    marginBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // ==========================================
  // 2. CONTENT & TEXT
  // ==========================================
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  lastUpdatedText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 20,
  },

  // ==========================================
  // 3. ACCORDION CARD
  // ==========================================
  card: {
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingRight: 8,
  },
  cardBody: {
    padding: 18,
    borderTopWidth: 1,
  },
  cardContentText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },

  // ==========================================
  // 4. FOOTER
  // ==========================================
  footer: {
    marginTop: 25,
    marginBottom: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});