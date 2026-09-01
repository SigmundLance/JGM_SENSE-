import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

export default function RecoveryEmailScreen() {
  const router = useRouter();
  const { isDarkModeEnabled, theme } = useTheme();

  // State 1: Email Entry | State 2: OTP Verification
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);

  // Explicitly navigate directly to the profile screen
  const handleGoBack = () => {
    router.replace('/(tabs)/profile');
  };

  const handleEmailSubmit = () => {
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email.');
      return;
    }
    setStep(2);
  };

  const handleVerifyCode = () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code.');
      return;
    }
    Alert.alert('Success', 'Recovery email verified!');
    handleGoBack();
  };

  // Dynamic Theme Styling
  const textColor = theme.text || (isDarkModeEnabled ? '#FFFFFF' : '#1C1C1E');
  const cardBgColor = isDarkModeEnabled ? (theme.sectionBg || '#1E1E1E') : '#FFFFFF';
  const inputBgColor = isDarkModeEnabled ? '#2C2C2E' : '#F9F5F6';
  const infoBgColor = isDarkModeEnabled ? '#2C2527' : '#F9F5F6';
  const subtitleColor = isDarkModeEnabled ? '#A09095' : '#8A7B80';
  const backBtnBg = isDarkModeEnabled ? '#2C2C2E' : '#FFFFFF';
  
  // Updated primary button background and text colors
  const primaryBtnBg = '#D77282';
  const primaryBtnTextColor = '#FFFFFF';

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background || (isDarkModeEnabled ? '#121212' : '#FFF6F6') },
      ]}
    >
      <StatusBar
        barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={[styles.backButton, { backgroundColor: backBtnBg }]}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Recovery Email</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {step === 1 ? (
            /* --- STEP 1: ADD / UPDATE RECOVERY EMAIL --- */
            <View style={styles.content}>
              <View style={styles.mainGroup}>
                {/* Top Mail Badge */}
                <View style={[styles.badgeCircle, { backgroundColor: backBtnBg }]}>
                  <Ionicons name="mail-outline" size={22} color={textColor} />
                </View>

                <Text style={[styles.descriptionText, { color: subtitleColor }]}>
                  Add or update the email used to recover your account.
                </Text>

                {/* Card Wrapper */}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                  <Text style={[styles.inputLabel, { color: subtitleColor }]}>
                    RECOVERY EMAIL ADDRESS
                  </Text>

                  <View style={[styles.inputBox, { backgroundColor: inputBgColor }]}>
                    <TextInput
                      placeholder="you@example.com"
                      placeholderTextColor={isDarkModeEnabled ? '#777' : '#B0A2A6'}
                      style={[styles.textInput, { color: textColor }]}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Information Callout */}
                  <View style={[styles.infoBox, { backgroundColor: infoBgColor }]}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={subtitleColor}
                      style={styles.infoIcon}
                    />
                    <Text style={[styles.infoText, { color: subtitleColor }]}>
                      This email will be used to recover your account if you forget your password.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: primaryBtnBg }]}
                onPress={handleEmailSubmit}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: primaryBtnTextColor }]}>
                  Save Recovery Email
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* --- STEP 2: CODE VERIFICATION --- */
            <View style={styles.content}>
              <View style={styles.mainGroup}>
                <View style={[styles.badgeCircle, { backgroundColor: backBtnBg }]}>
                  <Ionicons name="key-outline" size={22} color={textColor} />
                </View>

                <Text style={[styles.descriptionText, { color: subtitleColor }]}>
                  Please enter the code we sent to {'\n'}
                  <Text style={{ fontWeight: 'bold', color: textColor }}>{email}</Text>
                </Text>

                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                  <View style={styles.otpRow}>
                    {code.map((digit, index) => (
                      <TextInput
                        key={index}
                        style={[
                          styles.otpInput,
                          {
                            backgroundColor: inputBgColor,
                            color: textColor,
                          },
                        ]}
                        maxLength={1}
                        keyboardType="number-pad"
                        onChangeText={(val) => {
                          let newCode = [...code];
                          newCode[index] = val;
                          setCode(newCode);
                        }}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => Alert.alert('Resent', 'New verification code sent.')}
                    style={styles.resendTouch}
                  >
                    <Text style={[styles.resendText, { color: subtitleColor }]}>
                      I didn't receive a code
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: primaryBtnBg }]}
                onPress={handleVerifyCode}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: primaryBtnTextColor }]}>
                  Confirm Code
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerRightSpacer: {
    width: 42,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 90,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  mainGroup: {
    alignItems: 'center',
    paddingTop: 15,
  },
  badgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  descriptionText: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
    marginBottom: 28,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  inputLabel: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputBox: {
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  textInput: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 15,
  },
  infoBox: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontFamily: 'SF-Pro-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  otpInput: {
    width: 44,
    height: 54,
    borderRadius: 14,
    textAlign: 'center',
    fontFamily: 'SF-Pro-Bold',
    fontSize: 20,
  },
  resendTouch: {
    alignSelf: 'center',
    marginTop: 15,
  },
  resendText: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 16,
  },
});