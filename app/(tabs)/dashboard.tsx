import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getTempStatus, TempStatus } from '../../constants/temperature';
import { useTemp } from '../../context/TempContext';
import { useTheme } from '../../context/ThemeContext';
import { useProfilePhoto } from '../../hooks/use-profile-photo';
import { auth, database, db } from '../../firebaseConfig';

const FARROWING_REMINDER_WINDOW_DAYS = 30;

// new Date("YYYY-MM-DD") parses as UTC midnight, not local midnight -
// comparing that against local-time day boundaries can be off by hours
// (enough to shift which day it lands on) depending on the device's
// timezone. Parse the components and construct via the local-time
// Date constructor instead, wherever a stored date string needs to be
// compared against "today."
//
// Requires a strict match rather than a plain split+Number: Number('')
// is 0, not NaN, so a bare split on '', or on a partial/malformed
// string, can silently yield a "valid" Date (e.g. Jan 1 1900) instead
// of Invalid Date - which isNaN(date.getTime()) would never catch.
const parseISODateLocal = (isoDate: string): Date => {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(NaN);

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

const STATUS_GRADIENTS: Record<TempStatus, readonly [string, string]> = {
  offline: ['#C2B9BD', '#948A8E'],
  critical: ['#FF8F6B', '#D43C4A'],
  fault: ['#FFCF6B', '#F2994A'],
  cooling: ['#7FB8FC', '#2F6FED'],
  optimal: ['#7FD8A3', '#3FA66E'],
  warming: ['#FFCF6B', '#F2994A'],
};

type CameraStatus = 'online' | 'connecting' | 'offline';

interface CameraConfig {
  id: string;
  title: string;
  penId: string;
  ipAddress: string;
  streamPort?: number;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  timestamp: number;
  unread: boolean;
}

// HTML generator for webview streaming matching Livefeed logic
const getStreamHtml = (ipAddress: string, streamPort: number) => {
  const streamUrl = `http://${ipAddress}:${streamPort}/stream`;
  const captureUrl = `http://${ipAddress}:${streamPort}/capture`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; background-color: #000; overflow: hidden; }
          body, html { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
          img { width: 100%; height: 100%; object-fit: cover; display: block; }
        </style>
      </head>
      <body>
        <img id="streamView" src="${streamUrl}" />
        <script>
          const img = document.getElementById('streamView');
          let isFallbackActive = false;

          function triggerFallback() {
            if (isFallbackActive) return;
            isFallbackActive = true;
            
            function pollFrame() {
              const nextImg = new Image();
              nextImg.onload = function() {
                img.src = this.src;
                setTimeout(pollFrame, 50);
              };
              nextImg.onerror = function() {
                setTimeout(pollFrame, 500);
              };
              nextImg.src = "${captureUrl}?" + new Date().getTime();
            }
            pollFrame();
          }

          const loadTimeout = setTimeout(() => {
            if (!img.complete || img.naturalWidth === 0) {
              triggerFallback();
            }
          }, 2500);

          img.onerror = function() {
            clearTimeout(loadTimeout);
            triggerFallback();
          };
        </script>
      </body>
    </html>
  `;
};

export default function Dashboard() {
  const { theme, isDarkModeEnabled } = useTheme();
  const { currentTemp, isStale } = useTemp();
  const router = useRouter();
  const [userName, setUserName] = useState(auth.currentUser?.displayName || "Ashley");
  const [userPhoto, setUserPhoto] = useState<string | null>(auth.currentUser?.photoURL ?? null);
  // Custom-uploaded photo, live from Firestore - takes priority over
  // userPhoto, which otherwise reflects e.g. a Google account avatar.
  const firestorePhoto = useProfilePhoto(auth.currentUser?.uid);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [nearestFarrowing, setNearestFarrowing] = useState<{ name: string; date: string } | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserName(user?.displayName || "Ashley");
      setUserPhoto(user?.photoURL ?? null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const notificationsRef = ref(database, 'notifications');

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedNotifications: NotificationItem[] = Object.keys(data).map((key) => {
          const item = data[key];
          return {
            id: key,
            title: item.title || 'System Notification',
            body: item.body || '',
            type: item.type || 'General',
            timestamp: item.timestamp || Date.now(),
            unread: item.unread !== undefined ? item.unread : true,
          };
        });

        parsedNotifications.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(parsedNotifications);
      } else {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Unfiltered collection listen, same pattern GestationManagement.tsx
    // already uses - fine at small-farm record counts, but this refetches
    // every record on every change with no query/pagination. Worth
    // revisiting (e.g. a where('pregnancyStatus','==','Confirmed') query)
    // if the collection grows large; not addressing that here.
    const unsubscribe = onSnapshot(collection(db, 'Gestation_Records'), (snapshot) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const windowEnd = new Date(today);
      windowEnd.setDate(windowEnd.getDate() + FARROWING_REMINDER_WINDOW_DAYS);

      const upcoming = snapshot.docs
        .map((docSnap) => docSnap.data())
        .filter((data) => data.pregnancyStatus === 'Confirmed')
        .map((data) => ({
          name: (data.name as string) || 'Unnamed sow',
          date: data.estimatedFarrowDate as string,
          // new Date("YYYY-MM-DD") parses as UTC midnight, but `today`/
          // `windowEnd` above are local-time - on devices ahead/behind
          // UTC that mismatch can shift a date across the day boundary
          // by hours, misjudging both "already passed" and the 30-day
          // cutoff. Parse the components and construct in local time
          // instead, matching how today/windowEnd were built.
          parsed: parseISODateLocal(data.estimatedFarrowDate),
        }))
        .filter((r) => !isNaN(r.parsed.getTime()) && r.parsed >= today && r.parsed <= windowEnd);

      const nearest = upcoming.reduce<(typeof upcoming)[number] | null>(
        (best, r) => (!best || r.parsed < best.parsed ? r : best),
        null
      );

      setNearestFarrowing(nearest ? { name: nearest.name, date: nearest.date } : null);
    });

    return () => unsubscribe();
  }, []);

  const recentNotifications = notifications.slice(0, 3);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const formatNotifTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatShortDate = (isoDate: string) => {
    const date = parseISODateLocal(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ESP32-CAM Configurations matching LiveFeed
  const farrowingConfig: CameraConfig = {
    id: 'farrowing',
    title: 'Farrowing Area',
    penId: 'Pen 01',
    ipAddress: '192.168.0.213', // Matched with LiveFeed Screen IP
    streamPort: 80,
  };

  const broodingConfig: CameraConfig = {
    id: 'brooding',
    title: 'Brooding Area',
    penId: 'Pen 02',
    ipAddress: '192.168.1.213', // Matched with LiveFeed Screen IP
    streamPort: 80,
  };

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      const currentUser = auth.currentUser;
      setUserName(currentUser?.displayName || "Ashley");
      setUserPhoto(currentUser?.photoURL ?? null);
      return () => {
        setShowNotifications(false);
      };
    }, [])
  );

  const tempStatus = getTempStatus(currentTemp);
  // A stale reading overrides whatever the last real status was - same
  // reasoning as Temperature.tsx: don't let an old number display as a
  // confident current status.
  const status = isStale && tempStatus.status !== 'offline'
    ? { label: 'STALE', gradient: STATUS_GRADIENTS.offline }
    : { label: tempStatus.label.toUpperCase(), gradient: STATUS_GRADIENTS[tempStatus.status] };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background || '#FFF0F3' }}>
      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header Area */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            {firestorePhoto || userPhoto ? (
              <Image source={{ uri: firestorePhoto ?? userPhoto ?? undefined }} style={styles.logoImage} resizeMode="cover" />
            ) : (
              <Image 
                source={require('./Pictures/JGMLogo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            )}
          </View>

          {/* Notification Bell */}
          <View style={styles.bellWrapper}>
            <TouchableOpacity 
              style={styles.bellCircle} 
              onPress={() => setShowNotifications(!showNotifications)}
            >
              <Ionicons name="notifications-outline" size={24} color="#444" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {showNotifications && (
              <View style={[
                styles.dropdownContainer,
                { backgroundColor: isDarkModeEnabled ? '#2C2C2C' : '#FFF' }
              ]}>
                <View style={[
                  styles.dropdownTriangle,
                  { borderBottomColor: isDarkModeEnabled ? '#C0656F' : '#F7A8B8' }
                ]} />
                <View style={[
                  styles.dropdownHeader,
                  { backgroundColor: isDarkModeEnabled ? '#C0656F' : '#F7A8B8' }
                ]}>
                  <Text style={styles.dropdownHeaderText}>NOTIFICATIONS</Text>
                </View>
                <View style={styles.dropdownContent}>
                  {recentNotifications.length > 0 ? (
                    recentNotifications.map((notif, index) => (
                      <TouchableOpacity
                        key={notif.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          setShowNotifications(false);
                          router.push('/Notification');
                        }}
                        style={[
                          styles.notifItem,
                          index !== recentNotifications.length - 1 && [
                            styles.notifBorder,
                            { borderBottomColor: isDarkModeEnabled ? '#3A3A3A' : '#F0F0F0' }
                          ]
                        ]}
                      >
                        <View style={[
                          styles.notifAvatar,
                          { backgroundColor: isDarkModeEnabled ? '#3A3A3A' : '#F0F2F5' }
                        ]} />
                        <View style={styles.notifTextContainer}>
                          {notif.unread && (
                            <View style={styles.newTag}>
                              <Text style={styles.newTagText}>NEW</Text>
                            </View>
                          )}
                          <Text style={[
                            styles.notifMainText,
                            isDarkModeEnabled && { color: '#E0E0E0' }
                          ]}>
                            <Text style={[
                              styles.notifName,
                              { color: isDarkModeEnabled ? '#FFFFFF' : '#333' }
                            ]}>{notif.title} </Text>
                            <Text style={[
                              styles.notifAction,
                              { color: isDarkModeEnabled ? '#AAA' : '#888' }
                            ]}>{notif.body}</Text>
                          </Text>
                          <Text style={[
                            styles.notifTime,
                            { color: isDarkModeEnabled ? '#888' : '#A0A0A0' }
                          ]}>{formatNotifTime(notif.timestamp)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.notifEmptyContainer}>
                      <Text style={[
                        styles.notifEmptyText,
                        { color: isDarkModeEnabled ? '#888' : '#A0A0A0' }
                      ]}>No notifications yet</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={[
                    styles.seeAllButton,
                    { borderTopColor: isDarkModeEnabled ? '#3A3A3A' : '#F0F0F0' }
                  ]}
                  onPress={() => router.push('/Notification')}
                >
                  <Text style={[
                    styles.seeAllText,
                    { color: isDarkModeEnabled ? '#E0A0AF' : '#F7A8B8' }
                  ]}>See all notifications</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Reminder Card */}
        <LinearGradient 
          colors={['#E0A0AF', '#F7A8B8']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.reminderCard}
        >
          <View style={styles.reminderTopRow}>
            <View style={styles.reminderLogoCircle}>
              <Image source={require('./Pictures/JGMLogo.png')} style={styles.reminderLogoImage} resizeMode="contain" />
            </View>
            <View style={styles.reminderTextGroup}>
              <Text style={styles.reminderTitle}>
                OINK! REMINDER <Text style={styles.userNameText}>{userName}</Text>
              </Text>
              <Text style={styles.farrowingText}>
                {nearestFarrowing ? (
                  <>
                    {nearestFarrowing.name} — Farrowing{' '}
                    <Text style={styles.farrowingDateHighlight}>
                      {formatShortDate(nearestFarrowing.date)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.farrowingDateHighlight}>No upcoming farrowing dates</Text>
                )}
              </Text>
            </View>
            <View style={styles.radioDot} />
          </View>

          <TouchableOpacity style={styles.openBtn} onPress={() => router.replace('/(tabs)/GestationManagement')}>
            <Text style={styles.btnText}>Open</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>PEN OVERVIEW</Text>
    
        {/* Farrowing Area Dynamic Camera Feed */}
        <DashboardCameraCard
          config={farrowingConfig}
          onPress={() => router.replace('/(tabs)/LiveFeed')}
        />

        {/* Brooding Area Dynamic Camera Feed */}
        <DashboardCameraCard
          config={broodingConfig}
          onPress={() => router.replace('/(tabs)/LiveFeed')}
        />

        {/* Dynamic Temperature Card */}
        <LinearGradient 
          colors={status.gradient} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.tempCard}
        >
          <View style={styles.tempLeft}>
             <Text style={styles.thermoIcon}>🌡️</Text>
          </View>
          <View style={styles.tempRight}>
            <Text style={styles.tempLabel}>REAL-TIME TEMP</Text>
            <Text style={styles.tempValue}>{currentTemp !== null && currentTemp !== undefined ? `${currentTemp}°` : '--°'}</Text>
          </View>
          
          <View style={styles.tempActions}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusLabel}>{status.label}</Text>
            </View>
            <TouchableOpacity 
              style={styles.overrideBtn} 
              onPress={() => router.replace('/(tabs)/Temperature')}
            >
              <Text style={styles.overrideText}>Override</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <View style={{ height: 100 }} /> 
      </ScrollView>
    </View>
  );
}

// Sub-component for Dashboard Live Feeds using WebView engine matching LiveFeedScreen
interface DashboardCameraCardProps {
  config: CameraConfig;
  onPress: () => void;
}

function DashboardCameraCard({ config, onPress }: DashboardCameraCardProps) {
  const { title, ipAddress, streamPort = 80 } = config;
  const [status, setStatus] = useState<CameraStatus>('connecting');

  const pingUrl = `http://${ipAddress}:${streamPort}`;

  const checkCameraConnection = useCallback(async () => {
    setStatus((prev) => (prev === 'offline' ? 'connecting' : prev));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 200) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setStatus('offline');
    }
  }, [pingUrl]);

  useEffect(() => {
    checkCameraConnection();

    const interval = setInterval(() => {
      checkCameraConnection();
    }, 10000);

    return () => clearInterval(interval);
  }, [checkCameraConnection]);

  return (
    <TouchableOpacity style={styles.cameraCard} activeOpacity={0.9} onPress={onPress}>
      {status === 'online' && (
        <WebView
          source={{ html: getStreamHtml(ipAddress, streamPort) }}
          style={styles.cameraWebView}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowingReadAccessToURL="*"
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          onError={() => setStatus('offline')}
        />
      )}

      {status === 'connecting' && (
        <View style={styles.statePlaceholderConnecting}>
          <ActivityIndicator size="small" color="#D87588" style={{ marginBottom: 6 }} />
          <Text style={styles.stateTitle}>Connecting to {title}...</Text>
        </View>
      )}

      {status === 'offline' && (
        <View style={styles.statePlaceholderOffline}>
          <MaterialCommunityIcons name="satellite-variant" size={28} color="#9E9E9E" style={{ marginBottom: 4 }} />
          <Text style={styles.stateTitle}>{title} Unavailable</Text>
          <Text style={styles.stateDescription}>Tap to open Live Feed</Text>
        </View>
      )}

      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 80,
  },
  bottomSpacer: {
    height: 100,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9C8A90',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10,
  },
  logoCircle: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    resizeMode: 'cover',
  },
  bellWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  bellCircle: {
    width: 50,
    height: 50,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#E0536C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 58,
    right: 0,
    width: 300,
    backgroundColor: '#FFF',
    borderRadius: 15,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownTriangle: {
    position: 'absolute',
    top: -10,
    right: 14,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F7A8B8',
  },
  dropdownHeader: {
    backgroundColor: '#F7A8B8',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  dropdownHeaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dropdownContent: {
    paddingHorizontal: 15,
  },
  notifItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  notifBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notifAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F2F5',
    marginRight: 12,
  },
  notifTextContainer: {
    flex: 1,
  },
  newTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#95C14F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newTagText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  notifMainText: {
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 35,
    marginBottom: 3,
  },
  notifName: {
    fontWeight: 'bold',
    color: '#333',
  },
  notifAction: {
    color: '#888',
  },
  notifTime: {
    color: '#A0A0A0',
    fontSize: 11,
    textAlign: 'right',
  },
  notifEmptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  notifEmptyText: {
    fontSize: 13,
  },
  seeAllButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  seeAllText: {
    color: '#F7A8B8',
    fontSize: 13,
    fontWeight: '700',
  },
  reminderCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 25,
  },
  reminderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  reminderLogoCircle: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reminderLogoImage: {
    width: '100%',
    height: '100%',
  },
  reminderTextGroup: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFE0E8',
  },
  farrowingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  farrowingDateHighlight: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  openBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cameraCard: {
    position: 'relative',
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#000000',
  },
  cameraWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  badgeText: {
    color: '#2C2C2C',
    fontSize: 13,
    fontWeight: '800',
  },
  statePlaceholderConnecting: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FDECF0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statePlaceholderOffline: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stateTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginBottom: 2, 
    textAlign: 'center',
  },
  stateDescription: { 
    fontSize: 11, 
    color: '#B0B0B0', 
    textAlign: 'center',
  },
  tempCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 18,
  },
  tempLeft: {
    marginRight: 12,
  },
  thermoIcon: {
    fontSize: 38,
  },
  tempRight: {
    flex: 1,
  },
  tempLabel: {
    color: '#E8F5E9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tempValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFF',
    marginTop: -4,
  },
  tempActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 8,
  },
  statusLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  overrideBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  overrideText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});