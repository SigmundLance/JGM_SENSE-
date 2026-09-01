import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
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
import { auth } from '../../firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const googleSigninRef = useRef<any>(null);

  // Load SF Pro Fonts
  const [fontsLoaded] = useFonts({
    'SF-Pro-Regular': require('../../assets/images/fonts/SFPRODISPLAYREGULAR.otf'),
    'SF-Pro-Bold': require('../../assets/images/fonts/SFPRODISPLAYBOLD.otf'),
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: '864904306291-arr0d17ls2s1j1qnnl195gr9mkvtvg4m.apps.googleusercontent.com',
    androidClientId: '864904306291-5um28d2fkv94uuh7susu7otvv6cpppif.apps.googleusercontent.com',
    iosClientId: '864904306291-ecjj3l9cn2jafej4bn2chqsoll9lcts1.apps.googleusercontent.com',
  });

  // Initialize Google Sign-In on component mount
  useEffect(() => {
    const initializeGoogleSignIn = async () => {
      if (Platform.OS !== 'web') {
        try {
          // Dynamically import to ensure it loads after native modules are ready
          const { GoogleSignin, isSuccessResponse } = await import(
            '@react-native-google-signin/google-signin'
          );
          
          googleSigninRef.current = { GoogleSignin, isSuccessResponse };
          
          GoogleSignin.configure({
            webClientId: '864904306291-arr0d17ls2s1j1qnnl195gr9mkvtvg4m.apps.googleusercontent.com',
            iosClientId: '864904306291-ecjj3l9cn2jafej4bn2chqsoll9lcts1.apps.googleusercontent.com',
          });
        } catch (error) {
          console.error('Failed to initialize GoogleSignin:', error);
        }
      }
    };

    initializeGoogleSignIn();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      if (Platform.OS !== 'web') {
        if (!googleSigninRef.current) {
          Alert.alert('Google Sign-In Error', 'Google Sign-In module not initialized yet. Please try again.');
          return;
        }

        const { GoogleSignin, isSuccessResponse } = googleSigninRef.current;

        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }

        const signInResult = await GoogleSignin.signIn();
        if (!isSuccessResponse(signInResult) || !signInResult.data.idToken) {
          throw new Error('Google did not return an ID token.');
        }

        await signInWithCredential(auth, GoogleAuthProvider.credential(signInResult.data.idToken));
        router.replace('/(tabs)/dashboard');
        return;
      }

      await promptAsync();
    } catch (error: any) {
      Alert.alert('Google Sign-In Error', error?.message || 'Unable to sign in with Google.');
    }
  };

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;

      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        signInWithCredential(auth, credential)
          .then(() => {
            router.replace('/(tabs)/dashboard');
          })
          .catch((error) => {
            Alert.alert("Google Sign-In Error", error.message);
          });
      } else {
        Alert.alert("Authentication Failed", "No ID token received.");
      }
    }
  }, [response, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topSection}>
            <Image 
              source={require('./JGMLogo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.welcomeText}>Welcome to JGM-Sense</Text>
            <Text style={styles.subText}>
              Sign in to continue monitoring your{'\n'}farrowing system.
            </Text>
          </View>

          <View style={styles.cardContainer}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#C2B4B6"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#C2B4B6"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#8E7C80"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => router.push('/(auth)/ForgotPassword' as any)}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              disabled={Platform.OS === 'web' && !request}
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
            >
              <Image
                source={require('./GoogleIcon.png')}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.noAccountText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/Registration')}>
              <Text style={styles.signupText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FDF0F0' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, justifyContent: 'center' },
  topSection: { alignItems: 'center', marginBottom: 20 },
  logoImage: { width: 110, height: 110, marginBottom: 12 },
  welcomeText: { fontFamily: 'SF-Pro-Bold', fontSize: 26, color: '#2D1F21', marginBottom: 8, textAlign: 'center' },
  subText: { fontFamily: 'SF-Pro-Regular', fontSize: 14, color: '#8E7C80', textAlign: 'center', lineHeight: 20 },
  cardContainer: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24, elevation: 3 },
  inputLabel: { fontFamily: 'SF-Pro-Bold', fontSize: 11, color: '#8E7C80', letterSpacing: 0.8, marginBottom: 8 },
  input: { fontFamily: 'SF-Pro-Regular', backgroundColor: '#F9F5F5', height: 52, borderRadius: 16, paddingHorizontal: 16, fontSize: 15, color: '#2D1F21', marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F5F5', height: 52, borderRadius: 16, paddingHorizontal: 16, marginBottom: 8 },
  passwordInput: { fontFamily: 'SF-Pro-Regular', flex: 1, height: '100%', fontSize: 15, color: '#2D1F21' },
  eyeIcon: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontFamily: 'SF-Pro-Bold', fontSize: 13, color: '#C27581' },
  signInButton: { backgroundColor: '#D98A95', height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  signInButtonText: { fontFamily: 'SF-Pro-Bold', color: '#FFFFFF', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#F0E6E7' },
  orText: { fontFamily: 'SF-Pro-Bold', marginHorizontal: 12, color: '#C4B4B7', fontSize: 11, letterSpacing: 0.8 },
  googleButton: { flexDirection: 'row', backgroundColor: '#FFFFFF', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EFE6E7' },
  googleIcon: { width: 20, height: 20, marginRight: 10, resizeMode: 'contain' },
  googleButtonText: { fontFamily: 'SF-Pro-Bold', color: '#2D1F21', fontSize: 15 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  noAccountText: { fontFamily: 'SF-Pro-Regular', color: '#8E7C80', fontSize: 14 },
  signupText: { fontFamily: 'SF-Pro-Bold', color: '#C27581', fontSize: 14 },
});