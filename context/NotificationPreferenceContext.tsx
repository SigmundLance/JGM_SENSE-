import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'notificationsEnabled';

type NotificationPreferenceContextType = {
  isNotificationsEnabled: boolean;
  toggleNotifications: () => void;
};

const NotificationPreferenceContext = createContext<NotificationPreferenceContextType | undefined>(undefined);

export const NotificationPreferenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value !== null) {
          setIsNotificationsEnabled(value === 'true');
        }
      })
      .catch((error) => {
        console.error('Failed to read notification preference:', error);
      });
  }, []);

  const toggleNotifications = () => {
    setIsNotificationsEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch((error) => {
        console.error('Failed to persist notification preference:', error);
      });
      return next;
    });
  };

  return (
    <NotificationPreferenceContext.Provider value={{ isNotificationsEnabled, toggleNotifications }}>
      {children}
    </NotificationPreferenceContext.Provider>
  );
};

export const useNotificationPreference = () => {
  const context = useContext(NotificationPreferenceContext);

  if (context === undefined) {
    throw new Error('useNotificationPreference must be used within a NotificationPreferenceProvider');
  }

  return context;
};
