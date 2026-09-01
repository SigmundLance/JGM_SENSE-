import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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

// --- DATA STRUCTURE WITH CATEGORY GROUPS & COLOR SCHEMES ---
interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  data: FAQItem[];
}

const FAQ_SECTIONS: FAQCategory[] = [
  {
    title: 'General',
    icon: 'information-circle-outline',
    color: '#E57373',
    bgColor: '#FDEAEF',
    data: [
      {
        id: '1',
        question: 'What is the main purpose of JGM-Sense?',
        answer:
          'It is an IoT system designed to automate temperature control and remotely monitor sow farrowing and newborn piglets to prevent hypothermia.',
      },
    ],
  },
  {
    title: 'Temperature Monitoring',
    icon: 'thermometer-outline',
    color: '#D97B28',
    bgColor: '#FFF0E1',
    data: [
      {
        id: '2',
        question: 'How does the system automatically keep the piglets warm?',
        answer:
          "High-precision DHT22 sensors monitor the pen's climate, automatically triggering a 5V hardware relay to turn on heat lamps if the temperature drops.",
      },
      {
        id: '3',
        question: 'How is temperature monitored in real time?',
        answer:
          'Environmental sensors stream temperature and humidity readings continuously to the mobile dashboard and alert you when thresholds are breached.',
      },
    ],
  },
  {
    title: 'AI & Automation',
    icon: 'sparkles-outline',
    color: '#8E24AA',
    bgColor: '#F3E8F9',
    data: [
      {
        id: '4',
        question: 'How does the AI component help manage the brooding environment?',
        answer:
          'An ESP32-CAM captures images every 10 to 15 minutes, allowing an AI engine to analyze whether piglets are huddling from cold or scattering from heat.',
      },
    ],
  },
  {
    title: 'Gestation Management',
    icon: 'calendar-outline',
    color: '#3B8754',
    bgColor: '#E4F4E9',
    data: [
      {
        id: '5',
        question: 'What feature does the mobile app include to track the sows lifecycle?',
        answer:
          'The React Native app features a Sow Gestation Calendar that tracks reproductive milestones from insemination and pregnancy verification to the final farrowing date.',
      },
      {
        id: '6',
        question: 'How do I add a new gestation record?',
        answer:
          'From the Gestation page, tap the floating add button to open a form for the pig name and insemination date — expected farrowing is calculated automatically.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    icon: 'settings-outline',
    color: '#8C564B',
    bgColor: '#F7EBE8',
    data: [
      {
        id: '7',
        question: 'How do I reset my password?',
        answer:
          'Go to Account → My Profile → Change Password, then follow the prompts to set a new one.',
      },
      {
        id: '8',
        question: 'How does the system handle and store the environmental data it collects?',
        answer:
          'It uses Firebase for real-time sync, follows a 7-day rolling data retention policy, and condenses weekly logs into a Summary Report for long-term records.',
      },
    ],
  },
];

export default function FAQScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDarkModeEnabled, theme } = useTheme();

  // Reset scroll position, expanded items, and search when navigating away/returning
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      return () => {
        setExpandedIds([]);
        setSearchQuery('');
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      };
    }, [])
  );

  const [fontsLoaded] = useFonts({
    'SF-Pro-Regular': require('../../assets/images/fonts/SFPRODISPLAYREGULAR.otf'),
    'SF-Pro-Bold': require('../../assets/images/fonts/SFPRODISPLAYBOLD.otf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prevIds) =>
      prevIds.includes(id) ? prevIds.filter((prevId) => prevId !== id) : [...prevIds, id]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || '#FAF2F3' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/Account')}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text || '#2D1F21'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerText || '#2D1F21' }]}>
          Frequently Asked Questions
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('./Pictures/MainLogo.png')}
            style={styles.pigImage}
            resizeMode="contain"
          />
        </View>

        {/* Search FAQs Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBg || '#FFFFFF' }]}>
          <Ionicons name="search-outline" size={20} color="#D8A8B0" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text || '#2D1F21' }]}
            placeholder="Search FAQs..."
            placeholderTextColor="#C8B8BC"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories & Accordion List */}
        {FAQ_SECTIONS.map((section, secIndex) => {
          const filteredItems = section.data.filter(
            (item) =>
              item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.answer.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredItems.length === 0) return null;

          return (
            <View key={secIndex} style={styles.categoryGroup}>
              {/* Category Pill Tag */}
              <View style={[styles.categoryBadge, { backgroundColor: section.bgColor }]}>
                <Ionicons
                  name={section.icon}
                  size={15}
                  color={section.color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.categoryBadgeText, { color: section.color }]}>
                  {section.title}
                </Text>
              </View>

              {/* Question Cards */}
              {filteredItems.map((item) => {
                const isExpanded = expandedIds.includes(item.id);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.faqCard,
                      { backgroundColor: theme.cardBg || '#FFFFFF' },
                    ]}
                  >
                    {/* Left Accent Bar */}
                    <View style={[styles.leftAccentBar, { backgroundColor: section.color }]} />

                    <View style={styles.cardInnerContent}>
                      <TouchableOpacity
                        style={styles.faqHeader}
                        onPress={() => toggleExpand(item.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.questionText, { color: theme.text || '#2D1F21' }]}>
                          {item.question}
                        </Text>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={section.color}
                        />
                      </TouchableOpacity>

                      {/* Expandable Answer */}
                      {isExpanded && (
                        <View style={styles.answerContainer}>
                          <Text
                            style={[
                              styles.answerText,
                              { color: isDarkModeEnabled ? '#E5D8DA' : '#4A3B3E' },
                            ]}
                          >
                            {item.answer}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  pigImage: {
    width: 80,
    height: 80,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F8E8EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'SF-Pro-Regular',
    fontSize: 15,
  },
  categoryGroup: {
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 13,
  },
  faqCard: {
    borderRadius: 20,
    marginBottom: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  leftAccentBar: {
    width: 6,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardInnerContent: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    flex: 1,
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
    lineHeight: 21,
    marginRight: 10,
  },
  answerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5EAEA',
  },
  answerText: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
});