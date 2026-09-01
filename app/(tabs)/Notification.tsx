import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import * as Linking from 'expo-linking';

import { useRouter } from 'expo-router';

import { onValue, ref, update } from 'firebase/database';

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

import { database } from '../../firebaseConfig'; // Adjust path if needed



interface NotificationItem {

  id: string;

  title: string;

  body: string;

  type: string;

  timestamp: number;

  unread: boolean;

  iconColor?: string;

  iconBg?: string;

  pdfUrl?: string;

}



export default function NotificationScreen() {

  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);



  // Direct physical back button to Account screen

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



  // --- 1. LISTEN TO REALTIME DATABASE NOTIFICATIONS ---

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

            iconColor: item.iconColor || getCategoryColor(item.type).color,

            iconBg: item.iconBg || getCategoryColor(item.type).bg,

            pdfUrl: item.pdfUrl,

          };

        });



        // Sort by newest timestamp first

        parsedNotifications.sort((a, b) => b.timestamp - a.timestamp);

        setNotifications(parsedNotifications);

      } else {

        setNotifications([]);

      }

      setLoading(false);

    });



    return () => unsubscribe();

  }, []);



  // --- 2. MARK NOTIFICATION AS READ ON TAP ---

  const handlePressNotification = async (item: NotificationItem) => {

    if (item.unread) {

      try {

        const itemRef = ref(database, `notifications/${item.id}`);

        await update(itemRef, { unread: false });

      } catch (error) {

        console.error('Failed to update unread status:', error);

      }

    }



    // Action router: open external PDF or redirect to Report screen

    if (item.pdfUrl) {

      Linking.openURL(item.pdfUrl);

    } else if (item.type === 'Report') {

      router.push('/Report');

    }

  };



  // Icon styling mapping based on notification type

  const getCategoryColor = (type: string) => {

    switch (type) {

      case 'Temperature':

        return { color: '#E53935', bg: '#FFEBEE' };

      case 'Report':

        return { color: '#1E88E5', bg: '#E3F2FD' };

      case 'Added Record':

        return { color: '#43A047', bg: '#E8F5E9' };

      default:

        return { color: '#F7A8B8', bg: '#FCF3F5' };

    }

  };



  const formatTime = (timestamp: number) => {

    const date = new Date(timestamp);

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  };



  const renderItem = ({ item }: { item: NotificationItem }) => (

    <TouchableOpacity

      style={[styles.card, item.unread && styles.unreadCard]}

      onPress={() => handlePressNotification(item)}

      activeOpacity={0.7}

    >

      <View style={[styles.iconContainer, { backgroundColor: item.iconBg || '#FCF3F5' }]}>

        <MaterialCommunityIcons

          name={
            item.type === 'Temperature'
              ? 'thermometer-alert'
              : item.type === 'Report'
              ? 'file-document'
              : item.type === 'override'
              ? 'tune-variant'
              : 'bell'
          }

          size={22}

          color={item.iconColor || '#F7A8B8'}

        />

      </View>



      <View style={styles.textContainer}>

        <View style={styles.cardHeader}>

          <Text style={styles.title}>{item.title}</Text>

          {item.unread && <View style={styles.unreadBadge} />}

        </View>

        <Text style={styles.body}>{item.body}</Text>

        <Text style={styles.time}>{formatTime(item.timestamp)}</Text>

      </View>

    </TouchableOpacity>

  );



  return (

    <View style={styles.container}>

      {/* Header */}

      <View style={styles.header}>

        <TouchableOpacity onPress={handleBack} style={styles.backButton}>

          <Ionicons name="arrow-back" size={28} color="#F7A8B8" />

        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

      </View>



      {/* Content */}

      {loading ? (

        <ActivityIndicator size="large" color="#F7A8B8" style={{ marginTop: 50 }} />

      ) : notifications.length > 0 ? (

        <FlatList

          data={notifications}

          keyExtractor={(item) => item.id}

          renderItem={renderItem}

          contentContainerStyle={styles.listContent}

        />

      ) : (

        <View style={styles.emptyContainer}>

          <MaterialCommunityIcons name="bell-off-outline" size={60} color="#CCC" />

          <Text style={styles.emptyText}>No notifications yet</Text>

        </View>

      )}

    </View>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#FCF3F5', paddingTop: 50 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },

  backButton: { padding: 5, marginRight: 10 },

  headerTitle: { fontSize: 24, fontWeight: '700', color: '#333' },

  listContent: { paddingHorizontal: 20, paddingBottom: 30 },

  card: {

    flexDirection: 'row',

    backgroundColor: '#FFF',

    padding: 16,

    borderRadius: 15,

    marginBottom: 12,

    borderWidth: 1,

    borderColor: '#F0E0E5',

  },

  unreadCard: {

    borderColor: '#F7A8B8',

    backgroundColor: '#FFFFFF',

  },

  iconContainer: {

    width: 44,

    height: 44,

    borderRadius: 22,

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 12,

  },

  textContainer: { flex: 1 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  title: { fontSize: 15, fontWeight: '700', color: '#333', flex: 1 },

  unreadBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935', marginLeft: 6 },

  body: { fontSize: 13, color: '#666', marginTop: 4 },

  time: { fontSize: 11, color: '#999', marginTop: 6 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },

  emptyText: { color: '#888', marginTop: 10, fontSize: 16 },

}); 

