// Optimal piglet brooding range: 32-35°C.
// Source: EW Nutrition (2024); Estienne (2024).
export const OPTIMAL_MIN = 32;
export const OPTIMAL_MAX = 35;
export const TARGET_TEMP = 32;

// Fault-detection thresholds are NOT husbandry guidance. They are derived
// from system logic (expected heat-lamp response curve) to flag suspected
// equipment failure before a reading drifts into the critical range.
export const FAULT_DETECT_LOW = 27;
export const FAULT_DETECT_HIGH = 36;

export const CRITICAL_LOW = 24;
export const CRITICAL_HIGH = 38;

// Number of consecutive readings a status must hold before it's treated
// as a real transition worth notifying about. This debounces transient
// dips/spikes (e.g. a gust of wind briefly cooling the sensor) so a
// reading that recovers before this many samples never raises an alert.
export const STATUS_CONFIRMATION_READINGS = 3;

// Minimum gap between processed sensor writes. The firmware writes
// currentTemp and humidity to sensors/farrowing as separate calls, so a
// single physical reading can still fire the RTDB listener twice within
// milliseconds. This is a client-side filter for that, not a fix - the
// duplicate writes themselves are still happening at the source.
export const DUPLICATE_WRITE_GRACE_MS = 2000;

// How long without any write to sensors/farrowing before the last known
// reading is treated as stale rather than current. There is no
// timestamp in the sensor payload itself (confirmed against live data),
// so this is measured client-side from when onValue last fired. Chosen
// to tolerate normal gaps between readings (observed live data showed
// ~15s-3min between distinct samples) while still catching a dead
// device reasonably promptly - not tuned against real outage data.
export const STALE_AFTER_MS = 5 * 60 * 1000;

// 'fault' is an equipment-failure indicator (suspected heat lamp or
// component failure), not a severity rung between 'critical' and
// 'cooling'/'warming'. Don't treat this type as an ordered scale -
// a 'fault' reading can occur on either side of the optimal band and
// should be handled as its own signal, not compared for "more/less severe".
export type TempStatus = 'offline' | 'critical' | 'fault' | 'cooling' | 'optimal' | 'warming';

export interface TempStatusResult {
  status: TempStatus;
  label: string;
}

export function getTempStatus(temp: number | null | undefined): TempStatusResult {
  if (temp === null || temp === undefined || !Number.isFinite(temp)) {
    return { status: 'offline', label: 'Offline' };
  }
  if (temp <= CRITICAL_LOW || temp >= CRITICAL_HIGH) {
    return { status: 'critical', label: 'Critical' };
  }
  if (temp <= FAULT_DETECT_LOW || temp >= FAULT_DETECT_HIGH) {
    return { status: 'fault', label: 'Warning' };
  }
  if (temp < OPTIMAL_MIN) {
    return { status: 'cooling', label: 'Cooling Needed' };
  }
  if (temp > OPTIMAL_MAX) {
    return { status: 'warming', label: 'Above Optimal' };
  }
  return { status: 'optimal', label: 'Optimal' };
}
