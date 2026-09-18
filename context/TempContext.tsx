import { get, onValue, push, ref, set, update } from 'firebase/database';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { DUPLICATE_WRITE_GRACE_MS, getTempStatus, STALE_AFTER_MS, STATUS_CONFIRMATION_READINGS, TARGET_TEMP, TempStatus } from '../constants/temperature';
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
// Same reasoning as LAST_STATUS_PATH, tracked separately since staleness
// is an independent concern from the sensor-value status above it.
const LAST_STALE_PATH = 'notifications_state/lastStale';

// 1. Define the shape of our context data with Firebase properties
type TempContextType = {
  currentTemp: number | null;
  humidity: number | null;
  targetTemp: number | null;
  // When the sensor node was last observed to write anything at all
  // (not just a valid currentTemp) - null until the first reading ever
  // arrives. Distinct from "isStale": a device that's never connected
  // has lastReadingAt === null and isStale === false, since there's no
  // baseline yet to call stale - that case is already covered by
  // currentTemp being null (getTempStatus returns 'offline' for it).
  lastReadingAt: number | null;
  // True once more than STALE_AFTER_MS has passed since lastReadingAt -
  // i.e. we have a real last-known reading, but it's too old to trust
  // as "current." Ticks on its own via a timer, independent of new data
  // arriving, so it flips true purely from time passing.
  isStale: boolean;
  updateTemperature: (newTarget: number) => Promise<void>;
};

// 2. Create the context with a default of undefined
const TempContext = createContext<TempContextType | undefined>(undefined);

// 3. The Provider component (kept as TemperatureProvider to match your app root)
export const TemperatureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [targetTemp, setTargetTemp] = useState<number | null>(TARGET_TEMP);
  const [lastReadingAt, setLastReadingAt] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);
  const { isNotificationsEnabled } = useNotificationPreference();

  // Status-transition debounce state. Refs so updates don't trigger
  // re-renders or re-run the listener effect.
  const lastNotifiedStatus = useRef<TempStatus | null>(null);
  const pendingStatus = useRef<TempStatus | null>(null);
  const pendingCount = useRef(0);
  const lastProcessedAt = useRef<number | null>(null);
  const lastNotifiedStale = useRef<boolean>(false);
  // Set true only from the SECOND onValue fire onward - see the comment
  // at the setLastReadingAt call site below.
  const hasSeenFirstSnapshot = useRef(false);

  // The sensor listener effect below intentionally mounts once ([]), so
  // it can't read isNotificationsEnabled directly without going stale -
  // this ref keeps it current without re-attaching the listener.
  const isNotificationsEnabledRef = useRef(isNotificationsEnabled);
  useEffect(() => {
    isNotificationsEnabledRef.current = isNotificationsEnabled;
  }, [isNotificationsEnabled]);

  // Fires a notification on a false<->true isStale transition. Compares
  // against the ref (not React state) so it's independent of render
  // timing, and is a no-op if nextIsStale matches what was last
  // notified - that's what stops it refiring on every 30s tick while
  // still stale. Same push+persist+fireLocalNotification shape as the
  // sensor-status notifications above, but a separate, independent
  // concern from that debounce machinery - staleness is already
  // time-gated by STALE_AFTER_MS itself, so no confirmation-count is
  // needed on top of it.
  const notifyStaleTransition = (nextIsStale: boolean) => {
    if (nextIsStale === lastNotifiedStale.current) return;

    const previousNotifiedStale = lastNotifiedStale.current;
    lastNotifiedStale.current = nextIsStale;

    const title = nextIsStale ? 'Sensor Offline' : 'Sensor Back Online';
    const body = nextIsStale
      ? 'No new temperature readings for 5+ minutes.'
      : 'Temperature readings have resumed.';
    const { iconColor, iconBg } = STATUS_NOTIFICATION_STYLE[nextIsStale ? 'offline' : 'optimal'];

    const newNotifRef = push(ref(rtdb, 'notifications'));
    if (!newNotifRef.key) return;

    update(ref(rtdb), {
      [`notifications/${newNotifRef.key}`]: {
        title,
        body,
        type: 'Temperature',
        timestamp: Date.now(),
        unread: true,
        iconColor,
        iconBg,
      },
      [LAST_STALE_PATH]: nextIsStale,
    })
      .then(() => {
        fireLocalNotification(isNotificationsEnabledRef.current, title, body);
      })
      .catch((error) => {
        console.error('Failed to create staleness notification:', error);
        lastNotifiedStale.current = previousNotifiedStale;
      });
  };

  // Recompute isStale whenever a new reading arrives (clears staleness
  // immediately rather than waiting for the next timer tick below), and
  // keep a ref in sync so the timer can read the latest value without
  // restarting itself on every reading.
  const lastReadingAtRef = useRef<number | null>(null);
  useEffect(() => {
    lastReadingAtRef.current = lastReadingAt;

    // lastReadingAt === null means "no confirmed live write observed
    // yet this session" (see hasSeenFirstSnapshot above) - NOT "not
    // stale." Skip entirely rather than treat that as evidence of
    // anything: on a relaunch with the persisted state restored to
    // "already notified stale," evaluating this as nextIsStale=false
    // would fire a false "back online" before any real write has
    // actually been observed this session.
    if (lastReadingAt === null) return;

    const nextIsStale = Date.now() - lastReadingAt > STALE_AFTER_MS;
    setIsStale(nextIsStale);
    notifyStaleTransition(nextIsStale);
  }, [lastReadingAt]);

  // Ticks purely from time passing - this is what actually flips
  // isStale to true when the device goes silent, since no new RTDB
  // event will ever arrive to trigger the effect above in that case.
  useEffect(() => {
    const interval = setInterval(() => {
      const last = lastReadingAtRef.current;
      if (last === null) return; // same reasoning as above

      const nextIsStale = Date.now() - last > STALE_AFTER_MS;
      setIsStale(nextIsStale);
      notifyStaleTransition(nextIsStale);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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

      // Same reasoning as above, for staleness: a relaunch while the
      // sensor is still offline shouldn't be able to refire "Sensor
      // Offline" just because this session doesn't remember sending it.
      try {
        const staleSnap = await get(ref(rtdb, LAST_STALE_PATH));
        if (staleSnap.exists()) {
          lastNotifiedStale.current = Boolean(staleSnap.val());
        }
      } catch (error) {
        console.error('Failed to read persisted stale-notification state:', error);
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

            // onValue always fires once immediately with whatever is
            // currently cached/stored, the moment a listener attaches -
            // that includes arbitrarily old data if the device has been
            // offline since before this fire. That first fire is
            // ambiguous (could be a live write, could be a stale
            // replay) and must NOT be counted as evidence of a live
            // write, or every relaunch would reset the staleness clock
            // to "just now" regardless of how old the data actually is
            // - which would make a relaunch while genuinely offline
            // falsely report as freshly online. Only fires after the
            // first one are guaranteed to be real changes.
            if (hasSeenFirstSnapshot.current) {
              setLastReadingAt(Date.now());
            } else {
              hasSeenFirstSnapshot.current = true;
            }

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
    <TempContext.Provider
      value={{ currentTemp, humidity, targetTemp, lastReadingAt, isStale, updateTemperature }}
    >
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