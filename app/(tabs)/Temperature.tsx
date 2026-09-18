import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { push, ref } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getTempStatus, OPTIMAL_MAX, OPTIMAL_MIN, TARGET_TEMP, TempStatus } from '../../constants/temperature';
import { useNotificationPreference } from '../../context/NotificationPreferenceContext';
import { useTemp } from '../../context/TempContext';
import { useTheme } from '../../context/ThemeContext';
import { rtdb } from '../../firebaseConfig';
import { fireLocalNotification } from '../../utils/localNotifications';

// Distinct from every color used for temperature-status alerts
// (red/critical, amber/fault, blue/cooling, green/optimal).
const OVERRIDE_NOTIF_STYLE = { iconColor: '#7C5CFC', iconBg: '#F1EEFF' };

const clampToSafeRange = (value: number): number =>
  Math.min(OPTIMAL_MAX, Math.max(OPTIMAL_MIN, value));

const STATUS_STYLES: Record<TempStatus, { gradient: readonly [string, string]; dotColor: string }> = {
  offline: { gradient: ['#C2B9BD', '#948A8E'], dotColor: '#F2EEEE' },
  critical: { gradient: ['#FF8F6B', '#D43C4A'], dotColor: '#FFECEC' },
  fault: { gradient: ['#FFCF6B', '#F2994A'], dotColor: '#FFF6E6' },
  cooling: { gradient: ['#7FB8FC', '#2F6FED'], dotColor: '#EAF3FF' },
  optimal: { gradient: ['#7FD8A3', '#3FA66E'], dotColor: '#EAFFF2' },
  warming: { gradient: ['#FFCF6B', '#F2994A'], dotColor: '#FFF6E6' },
};

const BROODING_AREAS = [
  { id: '1', name: 'Brooding Area 1' },
  { id: '2', name: 'Brooding Area 2' },
  { id: '3', name: 'Brooding Area 3' },
  { id: '4', name: 'Brooding Area 4' },
];

export default function TemperatureScreen() {
  const { theme } = useTheme();
  // Extracted targetTemp and humidity from useTemp context
  const { currentTemp, humidity, targetTemp: initialTarget, isStale, updateTemperature } = useTemp();
  const { isNotificationsEnabled } = useNotificationPreference();

  const [targetTemp, setTargetTemp] = useState<number>(clampToSafeRange(initialTarget ?? TARGET_TEMP));
  const [savedTargetTemp, setSavedTargetTemp] = useState<number>(clampToSafeRange(initialTarget ?? TARGET_TEMP));
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Just the formatted time (e.g. "09:58") - the sentence wrapping it
  // ("Last Updated: " vs "No data since ") depends on isStale, built in
  // statusConfig below.
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('1');
  const [areaModalVisible, setAreaModalVisible] = useState(false);

  const [tempSelectedArea, setTempSelectedArea] = useState<string>('1');

  // Sync state if initialTarget is fetched after component mounts.
  // Clamped for display only - if Firebase holds a stored target outside
  // Safe Range (this has happened: a live target of 21°C was observed
  // during development), this makes the UI never show or let the user
  // step from an out-of-range value, but it does NOT correct Firebase.
  // savedTargetTemp becomes the clamped value too, so hasChanges stays
  // false and nothing gets written back until the user actually adjusts
  // and confirms - known gap: the real stored value can silently diverge
  // from what's displayed until that happens.
  useEffect(() => {
    if (initialTarget !== undefined && initialTarget !== null) {
      const clamped = clampToSafeRange(initialTarget);
      setTargetTemp(clamped);
      setSavedTargetTemp(clamped);
    }
  }, [initialTarget]);

  // Track the last time a valid temperature reading was received from Firebase
  useEffect(() => {
    if (currentTemp !== null && currentTemp !== undefined) {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastUpdated(timeString);
    }
  }, [currentTemp]);

  const hasChanges = targetTemp !== savedTargetTemp;
  const isAtMin = targetTemp <= OPTIMAL_MIN;
  const isAtMax = targetTemp >= OPTIMAL_MAX;

  // Calculate required lamp boost based on realtime currentTemp vs target
  const heatNeeded = useMemo(() => {
    if (currentTemp === null || currentTemp === undefined) return 0;
    const diff = targetTemp - currentTemp;
    return diff > 0 ? Number(diff.toFixed(1)) : 0;
  }, [currentTemp, targetTemp]);

  const statusConfig = useMemo(() => {
    const { status, label } = getTempStatus(currentTemp);

    if (status === 'offline') {
      const { gradient, dotColor } = STATUS_STYLES.offline;
      return {
        label,
        gradient,
        dotColor,
        humidityDisplay: '--%',
        tempDisplay: '--°C',
        updatedText: 'Sensor offline',
        isOnline: false,
      };
    }

    const formattedTemp =
      typeof currentTemp === 'number' ? currentTemp.toFixed(1) : currentTemp;
    const formattedHumidity = humidity !== null && humidity !== undefined ? `${humidity}%` : '--%';

    // A reading exists, but it's too old to trust as current - keep
    // showing the last-known numbers (still informative), but override
    // the status entirely rather than let a stale reading display as a
    // confident Optimal/Warning/Critical label.
    if (isStale) {
      const { gradient, dotColor } = STATUS_STYLES.offline;
      return {
        label: 'Stale',
        gradient,
        dotColor,
        humidityDisplay: formattedHumidity,
        tempDisplay: `${formattedTemp}°C`,
        updatedText: lastUpdated ? `No data since ${lastUpdated}` : 'No recent data',
        isOnline: false,
      };
    }

    const { gradient, dotColor } = STATUS_STYLES[status];
    return {
      label,
      gradient,
      dotColor,
      humidityDisplay: formattedHumidity,
      tempDisplay: `${formattedTemp}°C`,
      updatedText: lastUpdated ? `Last Updated: ${lastUpdated}` : 'Just now',
      isOnline: true,
    };
  }, [currentTemp, humidity, lastUpdated, isStale]);

  const handleAdjust = (type: 'up' | 'down') => {
    setTargetTemp((prev) => clampToSafeRange(type === 'up' ? prev + 1 : prev - 1));
  };

  const cancelChanges = () => {
    setTargetTemp(savedTargetTemp);
  };

  const confirmOverride = async () => {
    if (!hasChanges || isUpdating) return;
    setIsUpdating(true);
    const previousTarget = savedTargetTemp;

    try {
      await updateTemperature(targetTemp);
      setSavedTargetTemp(targetTemp);
      setToastMessage(`Target calibrated to ${targetTemp}°C`);

      // Fired immediately on confirm - independent of TempContext's
      // sensor-status debounce, which only governs automatic readings.
      if (previousTarget !== targetTemp) {
        const body = `Target changed ${previousTarget}°C → ${targetTemp}°C`;

        push(ref(rtdb, 'notifications'), {
          title: 'Target Temperature Changed',
          body,
          type: 'override',
          timestamp: Date.now(),
          unread: true,
          iconColor: OVERRIDE_NOTIF_STYLE.iconColor,
          iconBg: OVERRIDE_NOTIF_STYLE.iconBg,
        })
          .then(() => {
            // Only fires once the in-app record is actually written, so
            // a banner can't appear without one.
            fireLocalNotification(
              isNotificationsEnabled,
              'Target Temperature Changed',
              body,
              { channelId: 'override' },
              undefined,
              'OinkNotifications.wav'
            );
          })
          .catch((error) => {
            console.error('Failed to create override notification:', error);
          });
      }
    } catch (error) {
      setToastMessage(`Failed to update target temperature`);
    } finally {
      setIsUpdating(false);
      setTimeout(() => {
        setToastMessage(null);
      }, 2500);
    }
  };

  const statusBarStyle = theme.isDark ? 'light-content' : 'dark-content';
  const currentAreaName = BROODING_AREAS.find(a => a.id === selectedArea)?.name || 'Brooding Area 1';

  const openAreaModal = () => {
    setTempSelectedArea(selectedArea);
    setAreaModalVisible(true);
  };

  const handleAreaSelect = (areaId: string) => {
    setTempSelectedArea(areaId);
  };

  const confirmAreaSelection = () => {
    setSelectedArea(tempSelectedArea);
    setAreaModalVisible(false);
    setToastMessage(`Switched to ${BROODING_AREAS.find(a => a.id === tempSelectedArea)?.name}`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={statusBarStyle} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.headerText }]}>Temperature</Text>

        {/* Current Area Selector */}
        <TouchableOpacity
          style={[styles.areaSelector, { backgroundColor: theme.itemBg || '#FFF' }]}
          activeOpacity={0.8}
          onPress={openAreaModal}
        >
          <View style={styles.areaLeft}>
            <View style={styles.areaPin}>
              <Ionicons name="location-sharp" size={16} color="#FF6B81" />
            </View>
            <View>
              <Text style={styles.areaTextLabel}>CURRENT AREA</Text>
              <Text style={[styles.areaTextValue, { color: theme.text }]}>{currentAreaName}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={16} color="#8E8E93" />
        </TouchableOpacity>

        {/* Hero Card - Live Ambient Temperature */}
        <LinearGradient
          colors={statusConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>REALTIME AMBIENT TEMP</Text>
          <Text style={styles.heroValue}>{statusConfig.tempDisplay}</Text>

          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
            <Text style={styles.statusBadgeText}>{statusConfig.label}</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroSubRow}>
            <Ionicons name="water" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.heroSubText}>Humidity {statusConfig.humidityDisplay}</Text>
          </View>
          <Text style={styles.heroUpdated}>{statusConfig.updatedText}</Text>
        </LinearGradient>

        {/* Manual Override & Lamp Calibration */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>BROODING LAMP CALIBRATION</Text>
        <View style={[styles.overrideCard, { backgroundColor: theme.itemBg }]}>
          <Text style={[styles.overrideTitle, { color: theme.text }]}>Target Maintain Temperature</Text>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, isAtMin && { opacity: 0.4 }]}
              onPress={() => handleAdjust('down')}
              activeOpacity={0.7}
              disabled={isAtMin}
            >
              <Ionicons name="remove" size={24} color="#FF6B81" />
            </TouchableOpacity>

            <View style={styles.targetCenter}>
              <Text style={styles.targetCaption}>TARGET MAINTAIN</Text>
              <Text style={[styles.targetValue, { color: theme.text }]}>{targetTemp}°C</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperBtn, isAtMax && { opacity: 0.4 }]}
              onPress={() => handleAdjust('up')}
              activeOpacity={0.7}
              disabled={isAtMax}
            >
              <Ionicons name="add" size={24} color="#FF6B81" />
            </TouchableOpacity>
          </View>

          {/* Realtime Heat Calculation Banner */}
          <View style={styles.heatBadgeContainer}>
            <Ionicons name="flame" size={16} color="#FF6B81" style={{ marginRight: 6 }} />
            <Text style={styles.heatBadgeText}>
              Lamp Boost Required: <Text style={styles.heatBadgeValue}>+{heatNeeded}°C</Text>
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btnCancel, { backgroundColor: theme.itemBg }]}
            onPress={cancelChanges}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnCancelText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnConfirmContainer, !hasChanges && { opacity: 0.4 }]}
            onPress={confirmOverride}
            disabled={!hasChanges || isUpdating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#C41E23', '#FFB800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnConfirm}
            >
              {isUpdating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.btnConfirmText}>Calibrating...</Text>
                </View>
              ) : (
                <Text style={styles.btnConfirmText}>Confirm Target</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* System Info Section */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>SYSTEM INFO</Text>
        <View style={[styles.infoCard, { backgroundColor: theme.itemBg }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <Ionicons name="thermometer" size={14} color="#FF6B81" />
              </View>
              <Text style={[styles.infoLabel, { color: theme.text }]}>Current Target</Text>
            </View>
            <Text style={[styles.infoValue, { color: theme.text }]}>{savedTargetTemp}°C</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <Ionicons name="bulb" size={14} color="#FF6B81" />
              </View>
              <Text style={[styles.infoLabel, { color: theme.text }]}>Lamp Heat Boost</Text>
            </View>
            <Text style={[styles.infoValue, { color: '#FF6B81' }]}>+{heatNeeded}°C</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-checkmark" size={14} color="#FF6B81" />
              </View>
              <Text style={[styles.infoLabel, { color: theme.text }]}>Safe Range</Text>
            </View>
            <Text style={[styles.infoValue, { color: theme.text }]}>{OPTIMAL_MIN}°C – {OPTIMAL_MAX}°C</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}>
                <Ionicons name="radio" size={14} color="#FF6B81" />
              </View>
              <Text style={[styles.infoLabel, { color: theme.text }]}>Sensor Status</Text>
            </View>
            <Text
              style={[
                styles.infoValue,
                { color: statusConfig.isOnline ? '#00D26A' : '#D43C4A' },
              ]}
            >
              ● {statusConfig.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Toast Banner */}
      {toastMessage && (
        <View style={styles.toast}>
          <View style={styles.toastCheck}>
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Area Selection Modal */}
      <Modal
        visible={areaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAreaModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.itemBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Brooding Area</Text>
              <TouchableOpacity onPress={() => setAreaModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptions}>
              {BROODING_AREAS.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={[
                    styles.areaOption,
                    tempSelectedArea === area.id && { backgroundColor: '#FFE6E6', borderColor: '#FF6B81', borderWidth: 2 },
                    { backgroundColor: theme.itemBg }
                  ]}
                  onPress={() => handleAreaSelect(area.id)}
                >
                  <Ionicons 
                    name={tempSelectedArea === area.id ? "checkmark-circle" : "ellipse-outline"} 
                    size={24} 
                    color={tempSelectedArea === area.id ? '#FF6B81' : '#8E8E93'} 
                  />
                  <Text 
                    style={[
                      styles.areaOptionText, 
                      { color: theme.text },
                      tempSelectedArea === area.id && { fontWeight: 'bold' }
                    ]}
                  >
                    {area.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={confirmAreaSelection}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContainer: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  /* Area Selector */
  areaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    elevation: 3,
  },
  areaLeft: { flexDirection: 'row', alignItems: 'center' },
  areaPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6e5e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  areaTextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  areaTextValue: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },

  /* Hero Card */
  heroCard: {
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    elevation: 10,
    minHeight: 230,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 76,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 80,
  },
  statusBadge: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  heroDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 16,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSubText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  heroUpdated: {
    marginTop: 4,
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },

  /* Section Header */
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },

  /* Override Card */
  overrideCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    elevation: 4,
  },
  overrideTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 18,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e6e5e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetCenter: { flex: 1, alignItems: 'center' },
  targetCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 2,
  },
  targetValue: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  heatBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    backgroundColor: 'rgba(255, 107, 129, 0.1)',
    paddingVertical: 10,
    borderRadius: 16,
  },
  heatBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  heatBadgeValue: {
    color: '#FF6B81',
    fontWeight: 'bold',
  },

  /* Action Buttons */
  actionRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnConfirmContainer: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
  },
  btnConfirm: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* Info Card */
  infoCard: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 8,
    marginBottom: 16,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(209, 209, 214, 0.3)',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e6e5e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* Toast Banner */
  toast: {
    position: 'absolute',
    left: 25,
    right: 25,
    bottom: 30,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
    zIndex: 100,
  },
  toastCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00D26A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* Area Selection Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOptions: {
    gap: 12,
    marginBottom: 24,
  },
  areaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  areaOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCloseBtn: {
    backgroundColor: '#FF6B81',
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});