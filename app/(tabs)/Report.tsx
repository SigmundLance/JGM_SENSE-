import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { onValue, push, ref, serverTimestamp } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNotificationPreference } from '../../context/NotificationPreferenceContext';
import { useTheme } from '../../context/ThemeContext';
import { database } from '../../firebaseConfig';
import { fireLocalNotification } from '../../utils/localNotifications';

interface LogRecord {
  id: string;
  title?: string;
  category?: string;
  action?: string;
  sowId?: string;
  pigletCount?: number;
  temperature?: number;
  timestamp?: number;
  date?: string;
  notes?: string;
}

export default function ReportScreen() {
  const router = useRouter();
  const { theme, isDarkModeEnabled } = useTheme();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { isNotificationsEnabled } = useNotificationPreference();

  // Dynamic colors with fallbacks matching your screenshot theme
  const bgColor = theme.background || (isDarkModeEnabled ? '#121212' : '#FFF5F6');
  const cardBg = isDarkModeEnabled ? '#1E1E1E' : (theme.cardBg || '#FFFFFF');
  const textColor = isDarkModeEnabled ? '#FFFFFF' : (theme.text || '#2D1F21');
  const subtextColor = isDarkModeEnabled ? '#A0A0A0' : (theme.sectionTitle || '#8E8E93');

  // Handle hardware back button navigation
  const handleBack = () => {
    router.replace('/(tabs)/Account');
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // 1. Setup weekly Sunday recurring notification
  useEffect(() => {
    setupWeeklyNotification();
  }, []);

  const setupWeeklyNotification = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Notifications.cancelAllScheduledNotificationsAsync();

      await fireLocalNotification(
        isNotificationsEnabled,
        'Weekly Summary Ready 📊',
        'Your weekly farm report is available to view or download.',
        {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1, // Sunday
          hour: 9,
          minute: 0,
        },
        { type: 'SUNDAY_WEEKLY_REPORT' }
      );
    } catch (error) {
      console.error('Error setting up weekly notification:', error);
    }
  };

  // 2. Fetch real-time log records from Firebase Realtime Database
  useEffect(() => {
    const logsRef = ref(database, 'logs');

    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedLogs: LogRecord[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // Sort records by timestamp (newest first)
        parsedLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setLogs(parsedLogs);
      } else {
        setLogs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Export PDF Report via Expo Print & Share
  const handleGeneratePDF = async () => {
    if (logs.length === 0) return;
    setDownloading(true);

    try {
      const rowsHtml = logs
        .map(
          (item) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title || item.sowId || 'System Log'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.category ? `${item.category} - ${item.action || ''}` : item.pigletCount !== undefined ? `Piglets: ${item.pigletCount}` : 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.temperature ? `${item.temperature}°C` : 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatDate(item.timestamp, item.date)}</td>
          </tr>`
        )
        .join('');

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
              h1 { color: #EE8898; margin-bottom: 5px; }
              p { color: #666; font-size: 14px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #FAF2F3; color: #2D1F21; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; }
            </style>
          </head>
          <body>
            <h1>Weekly Farm Activity & Log Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>
                  <th>Event / Sow</th>
                  <th>Category & Action</th>
                  <th>Temperature</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

      // Save notification event to Realtime Database
      const notificationsRef = ref(database, 'notifications');
      await push(notificationsRef, {
        title: 'Report Downloaded 📄',
        body: `A PDF report containing ${logs.length} record(s) was generated.`,
        type: 'Report',
        timestamp: serverTimestamp(),
        unread: true,
      });
    } catch (error) {
      console.error('Error generating PDF report:', error);
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (timestamp?: number, fallbackDate?: string) => {
    if (!timestamp) return fallbackDate || '';
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} - ${timeStr}`;
  };

  const renderItem = ({ item }: { item: LogRecord }) => {
    // Dynamic fallback texts for subtitle
    const categoryText = item.category || 'Brooding';
    const actionText = item.action || (item.pigletCount !== undefined ? `${item.pigletCount} Piglets` : 'Ventilation Adjusted');
    const displayTitle = item.title || (item.sowId ? `Sow ID: ${item.sowId}` : 'AI Heat Regulation');

    return (
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.iconCircle}>
          <Ionicons name="layers" size={18} color="#F593A6" />
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: textColor }]}>{displayTitle}</Text>
          <Text style={[styles.cardSubtitle, { color: subtextColor }]}>
            {categoryText} • {actionText}
          </Text>
          <Text style={[styles.cardDate, { color: subtextColor }]}>
            {formatDate(item.timestamp, item.date)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F58B9E" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Weekly Report</Text>
      </View>

      {/* Warning / Info Banner */}
      <View style={styles.banner}>
        <Ionicons name="information-circle-outline" size={22} color="#FFFFFF" style={styles.bannerIcon} />
        <Text style={styles.bannerText}>
          Our system clears records every 7 days. Download your weekly summary to keep a permanent record.
        </Text>
      </View>

      {/* Logs Section Header */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>Logs for this Week</Text>

      {/* Logs List */}
      {loading ? (
        <ActivityIndicator size="large" color="#F58B9E" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: subtextColor, fontSize: 14 }}>
                No records available for this week.
              </Text>
            </View>
          }
        />
      )}

      {/* Generate & Download PDF Button */}
      {logs.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleGeneratePDF}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.downloadButtonText}>Generate & Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 54,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 10,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#F7A3B3',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  listPadding: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCE8EC',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDEEF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 3,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '400',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  downloadButton: {
    backgroundColor: '#333333',
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});