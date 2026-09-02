import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  // @ts-ignore: React Native persistence is present at runtime but omitted from web TS types
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Unified Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfen2YeAMkRqWrhyoQ7t0Oxnjs0zf02pw",
  authDomain: "jgm-sense-bbed9.firebaseapp.com",
  databaseURL: "https://jgm-sense-bbed9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jgm-sense-bbed9",
  storageBucket: "jgm-sense-bbed9.firebasestorage.app",
  messagingSenderId: "864904306291",
  appId: "1:864904306291:web:852e2c8151067b610e5406",
};

// Prevent re-initialization error on app reload/fast-refresh
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth safely with AsyncStorage persistence
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // Fallback if auth is already initialized (e.g. during Fast Refresh)
    return getAuth(app);
  }
})();

// Export Auth Providers & Database Instances
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const database = rtdb; // Alias added to support imports for 'database'
export const storage = getStorage(app);

export default app;