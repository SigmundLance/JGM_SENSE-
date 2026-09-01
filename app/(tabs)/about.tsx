import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Smart IoT Monitoring for\nFarrowing',
    description:
      'Monitor sow farrowing, piglet brooding\ntemperature, and farm activity from one\nintelligent mobile application.',
    image: require('./Pictures/P1.png'),
  },
  {
    id: '2',
    title: 'Real-Time Temperature\nMonitoring',
    description:
      'Receive live temperature updates and\nautomatic alerts to help maintain a safe\nbrooding environment for newborn piglets.',
    image: require('./Pictures/P2.png'),
  },
  {
    id: '3',
    title: 'Manage Farrowing with\nConfidence',
    description:
      'Track gestation milestones, receive important\nreminders, and monitor farrowing activities to\nsupport better livestock management.',
    image: require('./Pictures/P3.png'),
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const { isDarkModeEnabled, theme } = useTheme();

  const [fontsLoaded] = useFonts({
    'SF-Pro-Regular': require('../../assets/images/fonts/SFPRODISPLAYREGULAR.otf'),
    'SF-Pro-Bold': require('../../assets/images/fonts/SFPRODISPLAYBOLD.otf'),
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  if (!fontsLoaded) {
    return null;
  }

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/Account');
    }
  };

  const handleSkip = () => {
    // Jump straight to the last slide
    flatListRef.current?.scrollToIndex({ index: slides.length - 1 });
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.slideContainer}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.headerText }]}>
            {item.title}
          </Text>
          <Text style={[styles.description, { color: theme.text, opacity: 0.7 }]}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'}
      />

      {/* Top Header */}
      <View style={styles.header}>
        {currentIndex === slides.length - 1 ? (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.sectionBg }]}
            onPress={() =>
              flatListRef.current?.scrollToIndex({ index: currentIndex - 1 })
            }
          >
            <Ionicons name="chevron-back" size={20} color={theme.icon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        {currentIndex !== slides.length - 1 ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.text }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Swipeable Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {/* Footer / Pagination / Next Button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 20, 30) },
        ]}
      >
        <View style={styles.paginationContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index
                  ? [styles.activeDot, { backgroundColor: '#A26068' }]
                  : [
                      styles.inactiveDot,
                      { backgroundColor: theme.text, opacity: 0.2 },
                    ],
              ]}
            />
          ))}
        </View>

        {/* Gradient Next / Finish Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.buttonWrapper}
          onPress={handleNext}
        >
          <LinearGradient
            colors={['#E58C96', '#A05863']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1
                ? 'Welcome aboard!'
                : 'Next'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 10,
    height: 50,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  skipText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
  },
  placeholder: {
    width: 36,
    height: 36,
  },
  slideContainer: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  image: {
    width: width * 0.6,
    height: height * 0.3,
    marginBottom: 25,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 21,
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 12,
  },
  description: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 8,
  },
  buttonWrapper: {
    width: '100%',
  },
  nextButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});