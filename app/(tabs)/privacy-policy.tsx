import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface PolicyItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  intro?: string;
  bullets?: string[];
  content?: string;
}

// --- PRIVACY POLICY DATA ---
const privacyData: PolicyItem[] = [
  {
    id: '1',
    icon: 'information-circle-outline',
    title: 'What information do we collect?',
    intro:
      'We collect the information you provide when you register or use JGM-Sense, such as your name, email address, and account credentials.',
    bullets: [
      'Real-time temperature and humidity readings (DHT22 sensors)',
      'Live video feed data (ESP32-CAM)',
      '5V relay status logs',
      'Device ID, IP address, and usage activity',
    ],
  },
  {
    id: '2',
    icon: 'flash-outline',
    title: 'How do we use your information?',
    content:
      'Your data is primarily used to facilitate the automated thermal management and remote monitoring system. Environmental data triggers heat lamps to prevent piglet hypothermia, while camera data allows remote observation of farrowing. We also send instant push notifications regarding critical pen conditions.',
  },
  {
    id: '3',
    icon: 'videocam-outline',
    title: 'Camera & Video Privacy',
    content:
      'The ESP32-CAM module provides a live video feed strictly intended for observing livestock (sows and newborn piglets) to identify high-risk nesting behaviors or huddling. Video feeds are securely routed to your personal dashboard and are not publicly accessible, recorded without consent, or shared with third parties.',
  },
  {
    id: '4',
    icon: 'thermometer-outline',
    title: 'Temperature & Sensor Data',
    content:
      'Sensor data collected from your farm micro-climate is securely transmitted through our cloud-based communication layer to your mobile dashboard. This data is processed strictly for environment control and system analytics.',
  },
  {
    id: '5',
    icon: 'shield-checkmark-outline',
    title: 'Data Storage and Security',
    content:
      'We implement standard security measures to protect your account and IoT data. However, you are responsible for maintaining the confidentiality of your mobile dashboard login credentials.',
  },
  {
    id: '6',
    icon: 'mail-outline',
    title: 'Contact Us',
    content:
      'Questions about this policy or how your data is handled? Reach the JGM-Sense team any time using the Contact Support button below.',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { isDarkModeEnabled, theme } = useTheme();

  // Screen key counter forces complete component re-initialization when focused
  const [screenKey, setScreenKey] = useState<number>(0);

  // Force component reset to initial state whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setScreenKey((prev) => prev + 1);
    }, [])
  );

  return (
    <PrivacyPolicyContent
      key={screenKey}
      router={router}
      isDarkModeEnabled={isDarkModeEnabled}
      theme={theme}
    />
  );
}

// Inner Content Component to ensure clean default state mounting
function PrivacyPolicyContent({ router, isDarkModeEnabled, theme }: any) {
  // Fresh default states on every mount
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prevIds) =>
      prevIds.includes(id) ? prevIds.filter((prevId) => prevId !== id) : [...prevIds, id]
    );
  };

  // Filter sections by search query
  const filteredData = privacyData.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.intro && item.intro.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

      {/* Top Floating Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#D9828F' }]}
          onPress={() => router.replace('/settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Center Pig Image & Title Header */}
        <View style={styles.titleContainer}>
          <Image
            source={require('./Pictures/MainLogo.png')}
            style={styles.pigImage}
            resizeMode="contain"
          />
          <Text style={[styles.mainTitle, { color: theme.headerText }]}>Privacy Policy</Text>
          <Text style={[styles.subtitle, { color: isDarkModeEnabled ? '#AAA' : '#8E7C80' }]}>
            Learn how we collect, use, and protect your information while using JGM-Sense.
          </Text>
          <Text style={[styles.metaText, { color: isDarkModeEnabled ? '#C27581' : '#B86573' }]}>
            {privacyData.length} Sections · ~3 min read
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#FFF' }]}>
          <Ionicons name="search-outline" size={20} color="#A08C90" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search the Privacy Policy..."
            placeholderTextColor="#A08C90"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#A08C90" />
            </TouchableOpacity>
          )}
        </View>

        {/* Accordion List */}
        <View style={styles.policyList}>
          {filteredData.map((item) => {
            const isExpanded = expandedIds.includes(item.id);

            return (
              <View
                key={item.id}
                style={[
                  styles.cardContainer,
                  { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#FFF9F9' },
                ]}
              >
                {/* Accordion Header */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconBox}>
                    <Ionicons name={item.icon} size={20} color="#FFF" />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#A08C90"
                  />
                </TouchableOpacity>

                {/* Accordion Body */}
                {isExpanded && (
                  <View style={styles.cardBody}>
                    {item.intro && (
                      <Text style={[styles.bodyText, { color: isDarkModeEnabled ? '#DDD' : '#554447' }]}>
                        {item.intro}
                      </Text>
                    )}

                    {item.bullets && item.bullets.length > 0 && (
                      <View style={styles.bulletList}>
                        <Text style={[styles.bulletHeader, { color: isDarkModeEnabled ? '#DDD' : '#554447' }]}>
                          We also collect data from your connected hardware:
                        </Text>
                        {item.bullets.map((bullet, idx) => (
                          <View key={idx} style={styles.bulletRow}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={[styles.bulletText, { color: isDarkModeEnabled ? '#DDD' : '#554447' }]}>
                              {bullet}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {item.content && (
                      <Text style={[styles.bodyText, { color: isDarkModeEnabled ? '#DDD' : '#554447' }]}>
                        {item.content}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Last Updated Badge Card */}
        <View style={[styles.lastUpdatedCard, { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#FFF9F9' }]}>
          <View style={styles.calendarIconBox}>
            <Ionicons name="calendar-outline" size={20} color="#C27581" />
          </View>
          <View>
            <Text style={styles.lastUpdatedLabel}>LAST UPDATED</Text>
            <Text style={[styles.lastUpdatedDate, { color: theme.text }]}>August 2026</Text>
          </View>
        </View>

        {/* Support Callout Card */}
        <View style={[styles.supportCard, { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#FFF9F9' }]}>
          <Text style={[styles.supportTitle, { color: theme.text }]}>
            Questions about your privacy?
          </Text>
          <Text style={[styles.supportSubtitle, { color: isDarkModeEnabled ? '#AAA' : '#776669' }]}>
            If you have any questions regarding our Privacy Policy or how your information is handled, feel free to contact the JGM-Sense team.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => router.push('/contact-us')}
            activeOpacity={0.85}
          >
            <Text style={styles.contactBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -10,
  },
  pigImage: {
    width: 90,
    height: 90,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },

  /* Search Input */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  /* Accordion Cards */
  policyList: {
    gap: 12,
    marginBottom: 20,
  },
  cardContainer: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#C27581',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingRight: 8,
  },
  cardBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 10,
  },
  bulletHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 6,
  },
  bulletDot: {
    fontSize: 14,
    marginRight: 8,
    color: '#8E7C80',
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  /* Bottom Cards */
  lastUpdatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    marginBottom: 16,
  },
  calendarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FDEEEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastUpdatedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A08C90',
    letterSpacing: 0.8,
  },
  lastUpdatedDate: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  supportCard: {
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  supportSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    marginBottom: 18,
  },
  contactBtn: {
    backgroundColor: '#C27581',
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});