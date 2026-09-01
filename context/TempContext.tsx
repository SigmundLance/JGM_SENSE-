import { get, onValue, push, ref, set, update } from 'firebase/database';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { DUPLICATE_WRITE_GRACE_MS, getTempStatus, STATUS_CONFIRMATION_READINGS, TARGET_TEMP, TempStatus } from '../constants/temperature';
import { rtdb } from '../firebaseConfig';
import { fireLocalNotification } from '../utils/localNotifications';
import { useNotificationPreference } from './NotificationPreferenceContext';

const STATUS_NOTIFICATION_STYLE: Record<TempStatus, { iconColor: string; iconBg: string }> = {
  offline: { iconColor: '#757575', iconBg: '#EEEEEE' },
  critical: { iconColor: '#E53935', iconBg: '#FFEBEE' },
  fault: { iconColor: '#F2994A', iconBg: '#FFF6E6' },
  cooling: { iconColor: '#2F6FED', iconBg: '#EAF3FF' },
  optimal: { iconColor: '#3FA66E', iconBg: '#EAFFF2' },
  warming: { iconColor: '#F2994A', iconBg: '#FFF6E6' },
};

// Shared across devices in RTDB (rather than per-device AsyncStorage) so
// two phones watching the same pen don't each independently notify for
// the same status transition.
const LAST_STATUS_PATH = 'notifications_state/lastStatus';

// 1. Define the shape of our context data with Firebase properties
type TempContextType = {
  currentTemp: number | null;
  humidity: number | null;
  targetTemp: number | null;
  updateTemperature: (newTarget: number) => Promise<void>;
};

// 2. Create the context with a default of undefined
const TempContext = createContext<TempContextType | undefined>(undefined);

// 3. The Provider component (kept as TemperatureProvider to match your app root)
export const TemperatureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [targetTemp, setTargetTemp] = useState<number | null>(TARGET_TEMP);
  const { isNotificationsEnabled } = useNotificationPreference();

  // Status-transition debounce state. Refs so updates don't trigger
  // re-renders or re-run the listener effect.
  const lastNotifiedStatus = useRef<TempStatus | null>(null);
  const pendingStatus = useRef<TempStatus | null>(null);
  const pendingCount = useRef(0);
  const lastProcessedAt = useRef<number | null>(null);

  // The sensor listener effect below intentionally mounts once ([]), so
  // it can't read isNotificationsEnabled directly without going stale -
  // this ref keeps it current without re-attaching the listener.
  const isNotificationsEnabledRef = useRef(isNotificationsEnabled);
  useEffect(() => {
    isNotificationsEnabledRef.current = isNotificationsEnabled;
  }, [isNotificationsEnabled]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const start = async () => {
      // Read the persisted status BEFORE attaching the sensor listener,
      // so a cold start can't process incoming readings before it knows
      // what a previous session (or another device) already notified.
      try {
        const stateSnap = await get(ref(rtdb, LAST_STATUS_PATH));
        if (stateSnap.exists()) {
          lastNotifiedStatus.current = stateSnap.val() as TempStatus;
        }
      } catch (error) {
        console.error('Failed to read persisted notification status:', error);
      }

      if (!isMounted) return;

      const sensorRef = ref(rtdb, 'sensors/farrowing');

      unsubscribe = onValue(
        sensorRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const nextTemperature = data.currentTemp !== undefined ? Number(data.currentTemp) : null;

            setCurrentTemp(nextTemperature);
            setHumidity(data.humidity !== undefined ? Number(data.humidity) : null);
            setTargetTemp(data.targetTemp !== undefined ? Number(data.targetTemp) : TARGET_TEMP);

            if (nextTemperature === null || !Number.isFinite(nextTemperature)) {
              return;
            }

            const now = Date.now();

            // The firmware still writes currentTemp and humidity to
            // sensors/farrowing as separate calls, so a single physical
            // reading can fire this listener twice within milliseconds.
            // We can't fix that at the source from here, so we collapse
            // any fire that lands within DUPLICATE_WRITE_GRACE_MS of the
            // last one we actually processed - the duplicate write
            // itself still happens, we're just filtering it client-side.
            const isLikelyDuplicateWrite =
              lastProcessedAt.current !== null && now - lastProcessedAt.current < DUPLICATE_WRITE_GRACE_MS;

            if (isLikelyDuplicateWrite) {
              return;
            }

            lastProcessedAt.current = now;

            const { status, label } = getTempStatus(nextTemperature);

            if (status === pendingStatus.current) {
              pendingCount.current += 1;
            } else {
              pendingStatus.current = status;
              pendingCount.current = 1;
            }

            const isConfirmed = pendingCount.current >= STATUS_CONFIRMATION_READINGS;
            const isNewStatus = status !== lastNotifiedStatus.current;

            // Only notify once a status has held for enough consecutive
            // readings to rule out a transient blip, and only when it's
            // actually different from the status we last notified about.
            if (isConfirmed && isNewStatus) {
              const { iconColor, iconBg } = STATUS_NOTIFICATION_STYLE[status];
              const newNotifRef = push(ref(rtdb, 'notifications'));

              if (newNotifRef.key) {
                const previousNotifiedStatus = lastNotifiedStatus.current;
                // Optimistic: mark as notified immediately so a reading
                // that lands while this write is still in flight can't
                // trigger a second push for the same transition.
                lastNotifiedStatus.current = status;

                // Single multi-path update: the notification and the
                // persisted lastStatus are written atomically, so we
                // never end up with one recorded and not the other.
                update(ref(rtdb), {
                  [`notifications/${newNotifRef.key}`]: {
                    title: 'Temperature Reading',
                    body: `${label} — ${nextTemperature.toFixed(1)}°C`,
                    type: 'Temperature',
                    timestamp: Date.now(),
                    unread: true,
                    iconColor,
                    iconBg,
                  },
                  [LAST_STATUS_PATH]: status,
                })
                  .then(() => {
                    // Only fires once the in-app record is actually
                    // written, so a banner can't appear without one.
                    fireLocalNotification(
                      isNotificationsEnabledRef.current,
                      'Temperature Reading',
                      `${label} — ${nextTemperature.toFixed(1)}°C`
                    );
                  })
                  .catch((error) => {
                    console.error('Failed to create temperature notification:', error);
                    // Roll back so the next confirmed reading retries.
                    lastNotifiedStatus.current = previousNotifiedStatus;
                  });
              }
            }
          }
        },
        (error) => {
          console.error('Firebase DB Error:', error);
        }
      );
    };

    start();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // Updates the target temperature directly in Firebase
  const updateTemperature = async (newTarget: number) => {
    try {
      const targetRef = ref(rtdb, 'sensors/farrowing/targetTemp');
      await set(targetRef, newTarget);
    } catch (error) {
      console.error('Error updating temperature in Firebase:', error);
    }
  };

  return (
    <TempContext.Provider value={{ currentTemp, humidity, targetTemp, updateTemperature }}>
      {children}
    </TempContext.Provider>
  );
};

// 4. Custom hook to consume the context
export const useTemp = () => {
  const context = useContext(TempContext);

  if (context === undefined) {
    throw new Error('useTemp must be used within a TemperatureProvider');
  }

  return context;
};