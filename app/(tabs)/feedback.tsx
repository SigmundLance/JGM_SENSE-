import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// Import your custom theme hook
import { useTheme } from '../../context/ThemeContext';

export default function FeedbackScreen() {
  const router = useRouter();
  const { isDarkModeEnabled, theme } = useTheme();

  // Screen key counter forces complete component re-initialization when focused
  const [screenKey, setScreenKey] = useState<number>(0);

  // Reset form to default whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      setScreenKey((prev) => prev + 1);
    }, [])
  );

  return (
    <FeedbackContent
      key={screenKey}
      router={router}
      isDarkModeEnabled={isDarkModeEnabled}
      theme={theme}
    />
  );
}

// Inner Content Component to ensure clean default state mounting
function FeedbackContent({ router, isDarkModeEnabled, theme }: any) {
  // Fresh default state on every mount
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return 'Needs Improvement 😞';
      case 2:
        return 'Fair 😐';
      case 3:
        return 'Good 🙂';
      case 4:
        return 'Very Good 😊';
      case 5:
        return 'Loved it! 🐷';
      default:
        return 'Tap a star to rate';
    }
  };

  const handleBack = () => {
    router.replace('/settings');
  };

  const handleSubmit = () => {
    if (rating === 0 && feedbackText.trim() === '') {
      Alert.alert('Empty Feedback', 'Please provide a rating or some comments before submitting.');
      return;
    }

    Alert.alert(
      'Thank You!',
      'Your feedback helps us improve JGM-Sense for all farmers.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/settings'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

      {/* Top Floating Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#D9828F' },
          ]}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View style={styles.titleContainer}>
              <Image
                source={require('./Pictures/MainLogo.png')}
                style={styles.pigImage}
                resizeMode="contain"
              />
              <Text style={[styles.mainTitle, { color: theme.headerText }]}>App Feedback</Text>
              <Text style={[styles.subtitle, { color: isDarkModeEnabled ? '#AAA' : '#8E7C80' }]}>
                We are constantly working to improve JGM-Sense. Let us know how the system is working for your farm.
              </Text>
            </View>

            {/* Star Rating Card */}
            <View
              style={[
                styles.cardContainer,
                { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#FFF9F9' },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons name="star-outline" size={20} color="#FFF" />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Rate Your Experience</Text>
              </View>

              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= rating ? '#FFB800' : isDarkModeEnabled ? '#555' : '#D2C1C4'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingLabel, { color: rating > 0 ? '#C27581' : '#A08C90' }]}>
                {getRatingLabel(rating)}
              </Text>
            </View>

            {/* Text Feedback Card */}
            <View
              style={[
                styles.cardContainer,
                { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#FFF9F9' },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons name="chatbox-ellipses-outline" size={20} color="#FFF" />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Tell Us More</Text>
              </View>

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDarkModeEnabled ? '#2A2627' : '#FFF',
                    color: theme.text,
                    borderColor: isDarkModeEnabled ? '#3A3536' : '#F0E2E4',
                  },
                ]}
                placeholder="What features do you love? Are the heat lamps triggering as expected?"
                placeholderTextColor="#A08C90"
                multiline={true}
                numberOfLines={5}
                textAlignVertical="top"
                value={feedbackText}
                onChangeText={setFeedbackText}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              activeOpacity={0.85}
              onPress={handleSubmit}
            >
              <Text style={styles.submitBtnText}>Send Feedback</Text>
            </TouchableOpacity>

            {/* Support Alternative Section */}
            <View style={[styles.supportCard, { backgroundColor: isDarkModeEnabled ? theme.sectionBg : '#FFF9F9' }]}>
              <Text style={[styles.supportTitle, { color: theme.text }]}>Need Urgent Support?</Text>
              <Text style={[styles.supportSubtitle, { color: isDarkModeEnabled ? '#AAA' : '#776669' }]}>
                Having trouble with sensors or hardware? Send a direct message to support instead.
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 15,
    lineHeight: 18,
  },

  /* Card Containers */
  cardContainer: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
    fontSize: 15,
    fontWeight: '700',
  },

  /* Rating Stars */
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },

  /* Form Inputs */
  textInput: {
    fontSize: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 110,
    lineHeight: 20,
  },

  /* Action Buttons */
  submitBtn: {
    backgroundColor: '#C27581',
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Support Box */
  supportCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  supportSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 16,
  },
  contactBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#C27581',
    width: '100%',
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtnText: {
    color: '#C27581',
    fontSize: 14,
    fontWeight: '700',
  },
});