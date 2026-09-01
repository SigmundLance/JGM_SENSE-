import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../firebaseConfig';

export default function SignupScreen() {
  const router = useRouter();

  // Safe extraction with fallbacks to avoid context crashes
  const themeContext = useTheme();
  const theme = themeContext?.theme || {};
  const isDarkModeEnabled = themeContext?.isDarkModeEnabled || false;

  // State Management
  const [firstname, setFname] = useState('');
  const [lastname, setLname] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Main Registration Logic
  const handleRegister = async () => {
    if (!firstname || !lastname || !username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(userCredential.user);

      Alert.alert(
        'Verify Your Email',
        "Account created! We've sent a verification link to your email. Please verify before logging in.",
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (error: any) {
      let errorMessage = 'An error occurred during registration.';
      if (error.code === 'auth/email-already-in-use')
        errorMessage = 'That email is already registered.';
      if (error.code === 'auth/invalid-email')
        errorMessage = 'Please enter a valid email address.';
      if (error.code === 'auth/weak-password')
        errorMessage = 'Password should be at least 6 characters.';

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Theme Palette
  const isDark = isDarkModeEnabled;
  const bgColor = theme.background || (isDark ? '#121212' : '#FCEBF0');
  const cardBg = theme.sectionBg || (isDark ? '#1E1E1E' : '#FFFFFF');
  const inputBg = isDark ? '#2A2A2A' : '#FAF0F2';
  const textColor = theme.text || (isDark ? '#FFFFFF' : '#2D1F21');
  const labelColor = isDark ? '#B0A0A3' : '#8E7C80';
  const primaryAccent = '#C26D80';
  const iconColor = isDark ? '#999999' : '#8E7C80';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: bgColor }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={[styles.mainContainer, { backgroundColor: bgColor }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={textColor} />
            <Text style={[styles.backText, { color: textColor }]}> Back to Login</Text>
          </TouchableOpacity>

          {/* Logo Container (Placeholder Removed & Logo Enlarged) */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/JGMLogo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: textColor }]}>Create Your Account</Text>
            <Text style={[styles.subtitle, { color: labelColor }]}>
              Create an account to start monitoring your farrowing system.
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {/* First Name */}
            <Text style={[styles.fieldLabel, { color: labelColor }]}>FIRST NAME</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: inputBg },
                focusedField === 'fname' && { borderColor: primaryAccent, borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="person-outline" size={20} color={iconColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="First name"
                placeholderTextColor="#A09093"
                value={firstname}
                onChangeText={setFname}
                onFocus={() => setFocusedField('fname')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Last Name */}
            <Text style={[styles.fieldLabel, { color: labelColor }]}>LAST NAME</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: inputBg },
                focusedField === 'lname' && { borderColor: primaryAccent, borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="person-outline" size={20} color={iconColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Last name"
                placeholderTextColor="#A09093"
                value={lastname}
                onChangeText={setLname}
                onFocus={() => setFocusedField('lname')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Phone Number */}
            <Text style={[styles.fieldLabel, { color: labelColor }]}>PHONE NUMBER</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: inputBg },
                focusedField === 'phone' && { borderColor: primaryAccent, borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="call-outline" size={20} color={iconColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor="#A09093"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Username */}
            <Text style={[styles.fieldLabel, { color: labelColor }]}>USERNAME</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: inputBg },
                focusedField === 'username' && { borderColor: primaryAccent, borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="person-circle-outline" size={20} color={iconColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Choose a username"
                placeholderTextColor="#A09093"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Email Address */}
            <Text style={[styles.fieldLabel, { color: labelColor }]}>EMAIL ADDRESS</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: inputBg },
                focusedField === 'email' && { borderColor: primaryAccent, borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="mail-outline" size={20} color={iconColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="you@example.com"
                placeholderTextColor="#A09093"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password */}
            <Text style={[styles.fieldLabel, { color: labelColor }]}>PASSWORD</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: inputBg },
                focusedField === 'password' && { borderColor: primaryAccent, borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={iconColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Create a password"
                placeholderTextColor="#A09093"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={iconColor}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={[styles.fieldLabel, { color: labelColor }]}>CONFIRM PASSWORD</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: inputBg },
                focusedField === 'confirm' && { borderColor: primaryAccent, borderWidth: 1.5 },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={iconColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Re-enter your password"
                placeholderTextColor="#A09093"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={iconColor}
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: primaryAccent }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text style={{ color: labelColor, fontSize: 14 }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/')}>
              <Text style={{ color: primaryAccent, fontWeight: 'bold', fontSize: 14 }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoImage: {
    width: 110,
    height: 110,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },

  /* Card Container */
  card: {
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  submitButton: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});