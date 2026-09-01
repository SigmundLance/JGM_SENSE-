import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useFocusEffect, useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../firebaseConfig';

export default function AccountScreen() {
  const router = useRouter();
  const { theme, isDarkModeEnabled } = useTheme();

  // Reference for resetting scroll on focus
  const scrollRef = useRef<ScrollView>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(auth.currentUser?.photoURL ?? null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setUserPhoto(auth.currentUser?.photoURL ?? null);
    }, [])
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserPhoto(user?.photoURL ?? null);
    });

    return () => unsubscribe();
  }, []);

  const [fontsLoaded] = useFonts({
    'SF-Pro-Regular': require('../../assets/images/fonts/SFPRODISPLAYREGULAR.otf'),
    'SF-Pro-Bold': require('../../assets/images/fonts/SFPRODISPLAYBOLD.otf'),
  });

  const menuItems = [
    { id: '1', title: 'My Profile', icon: 'person-outline', path: '/profile', isLogout: false },
    { id: '2', title: 'Notification', icon: 'notifications-outline', path: '/Notification', isLogout: false },
    { id: '3', title: 'Weekly Report', icon: 'stats-chart-outline', path: '/Report', isLogout: false },
    { id: '4', title: 'Settings', icon: 'settings-outline', path: '/settings', isLogout: false },
    { id: '5', title: 'FAQ', icon: 'help-circle-outline', path: '/faq', isLogout: false },
    { id: '6', title: 'About', icon: 'information-circle-outline', path: '/about', isLogout: false },
    { id: '7', title: 'Logout', icon: 'log-out-outline', path: null, isLogout: true },
  ] as const;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)');
    } catch (error: any) {
      Alert.alert('Logout Error', error.message);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  // Get current user display details or default fallback
  const userEmail = auth.currentUser?.email || '2303640@ub.edu.ph';
  const userName = auth.currentUser?.displayName || 'Ashley';

  // Dynamic colors for dark vs light mode
  const cardBgColor = isDarkModeEnabled ? '#1E1E1E' : '#FFFFFF';
  const dividerColor = isDarkModeEnabled ? '#2A2A2A' : '#F7F0F1';
  const subtextColor = isDarkModeEnabled ? '#A09093' : '#8E7C80';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: theme.background || '#FFF6F6' }]}>
        <StatusBar barStyle={isDarkModeEnabled ? 'light-content' : 'dark-content'} />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Title */}
          <Text style={[styles.headerTitle, { color: theme.text || '#2D1F21' }]}>
            Account
          </Text>

          {/* User Profile Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.profileCard, { backgroundColor: cardBgColor }]}
            onPress={() => router.push('/profile' as any)}
          >
            <View style={styles.profileHeaderRow}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: isDarkModeEnabled ? '#2C1D20' : '#FDF0F0' },
                ]}
              >
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person-outline" size={24} color="#A05C68" />
                )}
              </View>
              <View style={styles.profileTextInfo}>
                <Text style={[styles.userName, { color: theme.text || '#2D1F21' }]}>
                  {userName}
                </Text>
                <Text style={[styles.userEmail, { color: subtextColor }]}>
                  {userEmail}
                </Text>
              </View>
            </View>

            <View style={[styles.profileCardDivider, { backgroundColor: dividerColor }]} />

            <View style={styles.viewProfileRow}>
              <Text style={[styles.viewProfileText, { color: theme.text || '#2D1F21' }]}>
                View Profile
              </Text>
              <Ionicons name="chevron-forward" size={14} color={subtextColor} />
            </View>
          </TouchableOpacity>

          {/* Grouped Menu List */}
          <View style={[styles.menuCardGroup, { backgroundColor: cardBgColor }]}>
            {menuItems.map((item, index) => {
              const isLogout = item.isLogout;
              const isLast = index === menuItems.length - 1;

              return (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isLogout) {
                        Alert.alert(
                          'Logout',
                          'Are you sure you want to log out of JGM-Sense?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Log Out',
                              style: 'destructive',
                              onPress: () => handleLogout(),
                            },
                          ]
                        );
                      } else if (item.path) {
                        router.push(item.path as any);
                      }
                    }}
                  >
                    <View style={styles.menuLeft}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={isLogout ? '#E53935' : theme.text || '#2D1F21'}
                      />
                      <Text
                        style={[
                          styles.menuText,
                          { color: isLogout ? '#E53935' : theme.text || '#2D1F21' },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                  </TouchableOpacity>

                  {!isLast && (
                    <View style={[styles.menuDivider, { backgroundColor: dividerColor }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 50,
  },
  headerTitle: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 28,
    marginBottom: 20,
    marginTop: 10,
  },

  /* Profile Card Styles */
  profileCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    resizeMode: 'cover',
  },
  profileTextInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 18,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: 'SF-Pro-Regular',
    fontSize: 13,
  },
  profileCardDivider: {
    height: 1,
    marginVertical: 14,
  },
  viewProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewProfileText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 13,
  },

  /* Grouped Menu List Styles */
  menuCardGroup: {
    borderRadius: 24,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontFamily: 'SF-Pro-Bold',
    fontSize: 15,
    marginLeft: 16,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 20,
  },
});