import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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

// Custom theme hook
import { useTheme } from '../../context/ThemeContext';

// --- CONTACT DATA ---
const contactData = [
  {
    id: '1',
    name: 'Bautista, Sigmund Lance N.',
    email: '1700310@ub.edu.ph',
    phone: '+63 999 869 3888',
    image: require('./Pictures/MrBautista.jpg'),
  },
  {
    id: '2',
    name: 'Lumanglas, Kristina Ashley C.',
    email: '2303640@ub.edu.ph',
    phone: '+63 994 470 7502',
    image: require('./Pictures/MsLumanglas.jpg'),
  },
  {
    id: '3',
    name: 'Dela Cruz, Keith Emmanuel D.',
    email: '1802057@ub.edu.ph',
    phone: '+63 993 811 5266',
    image: require('./Pictures/MrDelaCruz.jpg'),
  },
];

// --- SOCIAL DATA WITH URLS ---
const socialLinks = [
  { 
    id: 'fb', 
    label: 'Facebook', 
    icon: 'logo-facebook',
    url: 'https://www.facebook.com/share/18Vvj2m91K/'
  },
  { 
    id: 'x', 
    label: 'X', 
    icon: 'close', 
    url: 'https://x.com/yourhandle' 
  },
  { 
    id: 'ig', 
    label: 'Instagram', 
    icon: 'logo-instagram',
    url: 'https://instagram.com/yourprofile' 
  },
  { 
    id: 'mail', 
    label: 'Email', 
    icon: 'mail-outline',
    url: 'mailto:support@jgmsense.com' 
  },
];

export default function ContactUsScreen() {
  const router = useRouter();
  const { isDarkModeEnabled, theme } = useTheme();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Helper function to open links safely
  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn(`Cannot open URI: ${url}`);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  // Dynamic Theme Colors
  const bgColor = theme.background || (isDarkModeEnabled ? '#121212' : '#FDF2F4');
  const cardBg = isDarkModeEnabled ? '#1E1E1E' : '#FFFFFF';
  const headerTextColor = theme.headerText || (isDarkModeEnabled ? '#FFFFFF' : '#1F1A1C');
  const bodyTextColor = isDarkModeEnabled ? '#E0E0E0' : '#2D1F21';
  const subtextColor = isDarkModeEnabled ? '#A0A0A0' : '#8E7C80';
  const placeholderColor = isDarkModeEnabled ? '#666666' : '#B0A0A4';
  const inputBg = isDarkModeEnabled ? '#2A2A2C' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: cardBg }]}
          onPress={() => router.replace('/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={headerTextColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: headerTextColor }]}>Contact Us</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* SECTION: Meet the Team */}
            <Text style={[styles.sectionHeading, { color: headerTextColor }]}>Meet the Team</Text>
            <Text style={[styles.sectionSubheading, { color: subtextColor }]}>
              The developers behind JGM-Sense
            </Text>

            {/* Member Cards */}
            <View style={styles.teamContainer}>
              {contactData.map((contact) => (
                <View
                  key={contact.id}
                  style={[styles.memberCard, { backgroundColor: cardBg }]}
                >
                  <Image
                    source={contact.image}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: bodyTextColor }]}>
                      {contact.name}
                    </Text>
                    
                    {/* Email Row */}
                    <TouchableOpacity 
                      style={styles.contactRow}
                      onPress={() => handleOpenLink(`mailto:${contact.email}`)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="mail-outline" size={14} color={subtextColor} style={styles.iconMargin} />
                      <Text style={[styles.contactText, { color: subtextColor }]}>
                        {contact.email}
                      </Text>
                    </TouchableOpacity>

                    {/* Phone Row */}
                    <TouchableOpacity 
                      style={styles.contactRow}
                      onPress={() => handleOpenLink(`tel:${contact.phone.replace(/\s+/g, '')}`)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="call-outline" size={14} color={subtextColor} style={styles.iconMargin} />
                      <Text style={[styles.contactText, { color: subtextColor }]}>
                        {contact.phone}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* SECTION: Divider */}
            <View style={[styles.divider, { backgroundColor: isDarkModeEnabled ? '#2A2A2C' : '#EFE2E4' }]} />

            {/* SECTION: Send us a Message */}
            <Text style={[styles.sectionHeading, { color: headerTextColor }]}>Send us a Message</Text>
            <Text style={[styles.sectionSubheading, { color: subtextColor }]}>
              We usually respond within 1–2 business days
            </Text>

            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, color: bodyTextColor, borderColor: isDarkModeEnabled ? '#333' : '#F0E6E8' },
              ]}
              placeholder="Your Name"
              placeholderTextColor={placeholderColor}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, color: bodyTextColor, borderColor: isDarkModeEnabled ? '#333' : '#F0E6E8' },
              ]}
              placeholder="Your Email"
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: inputBg, color: bodyTextColor, borderColor: isDarkModeEnabled ? '#333' : '#F0E6E8' },
              ]}
              placeholder="How can we help you?"
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity style={styles.submitButton} activeOpacity={0.85}>
              <Text style={styles.submitButtonText}>Send Message</Text>
              <Ionicons name="paper-plane" size={16} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {/* SECTION: Connect with us */}
            <View style={styles.socialSection}>
              <Text style={[styles.socialTitle, { color: subtextColor }]}>CONNECT WITH US</Text>
              <View style={styles.socialRow}>
                {socialLinks.map((item) => (
                  <View key={item.id} style={styles.socialItem}>
                    <TouchableOpacity
                      style={[styles.socialIconButton, { backgroundColor: cardBg }]}
                      activeOpacity={0.7}
                      onPress={() => handleOpenLink(item.url)}
                    >
                      <Ionicons name={item.icon as any} size={20} color={bodyTextColor} />
                    </TouchableOpacity>
                    <Text style={[styles.socialLabel, { color: subtextColor }]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 26,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Headings
  sectionHeading: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 15,
  },
  sectionSubheading: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 13,
    marginBottom: 16,
    marginTop: 2,
  },

  // Team Section
  teamContainer: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  iconMargin: {
    marginRight: 6,
  },
  contactText: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 12,
  },

  divider: {
    height: 1,
    width: '100%',
    marginVertical: 24,
  },

  // Inputs
  input: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 15,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  textArea: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 15,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    height: 120,
    marginBottom: 16,
    borderWidth: 1,
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#D77282',
    flexDirection: 'row',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#D77282',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontFamily: 'SF-Pro-Bold',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Socials Section
  socialSection: {
    alignItems: 'center',
  },
  socialTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 16,
    fontWeight: '800',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialItem: {
    alignItems: 'center',
  },
  socialIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  socialLabel: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 11,
    fontWeight: '600',
  },
});