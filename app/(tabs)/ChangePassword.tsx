import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { updatePassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../firebaseConfig';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { isDarkModeEnabled, theme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility States
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  // Load SF Pro Fonts
  const [fontsLoaded] = useFonts({
    'SF-Pro-Regular': require('../../assets/images/fonts/SFPRODISPLAYREGULAR.otf'),
    'SF-Pro-Bold': require('../../assets/images/fonts/SFPRODISPLAYBOLD.otf'),
  });

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    if (user) {
      try {
        await updatePassword(user, newPassword);
        Alert.alert('Success', 'Your JGM-Sense password has been updated!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/profile') },
        ]);
      } catch (error: any) {
        Alert.alert('Action Failed', error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  // Dynamic Theme Colors
  const bgColor = theme.background || (isDarkModeEnabled ? '#121212' : '#FFF6F6');
  const cardBg = isDarkModeEnabled ? (theme.sectionBg || '#1E1E1E') : '#FFFFFF';
  const inputBg = isDarkModeEnabled ? '#2A2A2C' : '#F9F5F5';
  const textColor = theme.headerText || (isDarkModeEnabled ? '#FFFFFF' : '#2D1F21');
  const subtextColor = isDarkModeEnabled ? '#A0A0A0' : '#8E7C80';
  const placeholderColor = isDarkModeEnabled ? '#666666' : '#C2B4B6';
  const iconColor = theme.icon || (isDarkModeEnabled ? '#FFFFFF' : '#2D1F21');
  
  // Changed button color to #D77282
  const buttonBg = '#D77282';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Navigation Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/profile')}
              style={[styles.backButton, { backgroundColor: cardBg }]}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={iconColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>Change Password</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Lock Icon Badge & Subtitle */}
          <View style={styles.topSection}>
            <View style={[styles.lockBadge, { backgroundColor: cardBg }]}>
              <Ionicons name="lock-closed-outline" size={24} color={iconColor} />
            </View>
            <Text style={[styles.subtitle, { color: subtextColor }]}>
              {'Want a fresh start? Update your JGM-Sense\npassword below.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.cardContainer, { backgroundColor: cardBg }]}>
            {/* Current Password */}
            <Text style={[styles.inputLabel, { color: subtextColor }]}>CURRENT PASSWORD</Text>
            <View style={[styles.passwordContainer, { backgroundColor: inputBg }]}>
              <TextInput
                style={[styles.passwordInput, { color: textColor }]}
                placeholder="••••••••"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent(!showCurrent)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={subtextColor}
                />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text style={[styles.inputLabel, { color: subtextColor }]}>NEW PASSWORD</Text>
            <View style={[styles.passwordContainer, { backgroundColor: inputBg }]}>
              <TextInput
                style={[styles.passwordInput, { color: textColor }]}
                placeholder="Enter new password"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNew(!showNew)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={subtextColor}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm New Password */}
            <Text style={[styles.inputLabel, { color: subtextColor }]}>CONFIRM NEW PASSWORD</Text>
            <View style={[styles.passwordContainer, { backgroundColor: inputBg }]}>
              <TextInput
                style={[styles.passwordInput, { color: textColor }]}
                placeholder="Re-enter new password"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={subtextColor}
                />
              </TouchableOpacity>
            </View>

            {/* Password Requirements Info Box */}
            <View style={[styles.infoBox, { backgroundColor: inputBg }]}>
              <Ionicons name="information-circle-outline" size={20} color={subtextColor} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: subtextColor }]}>
                Password must contain at least 8 characters, including one uppercase letter and one number.
              </Text>
            </View>
          </View>

          {/* Update Password Action Button */}
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: buttonBg }]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.updateButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 20,
  },
  headerSpacer: {
    width: 44,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  subtitle: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardContainer: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  inputLabel: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  passwordInput: {
    fontFamily: 'SF-Pro-Regular',
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  infoText: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  updateButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    fontFamily: 'SF-Pro-Bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
});