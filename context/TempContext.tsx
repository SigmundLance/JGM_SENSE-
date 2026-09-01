import { onValue, push, ref, set } from 'firebase/database';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { rtdb } from '../firebaseConfig';

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
  const [targetTemp, setTargetTemp] = useState<number | null>(32);

  useEffect(() => {
    // Listens to your Realtime Database node
    const sensorRef = ref(rtdb, 'sensors/farrowing');

    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const nextTemperature = data.currentTemp !== undefined ? Number(data.currentTemp) : null;

          setCurrentTemp(nextTemperature);
          setHumidity(data.humidity !== undefined ? Number(data.humidity) : null);
          setTargetTemp(data.targetTemp !== undefined ? Number(data.targetTemp) : 32);

          if (nextTemperature !== null && Number.isFinite(nextTemperature)) {
            const notificationsRef = ref(rtdb, 'notifications');
            push(notificationsRef, {
              title: 'Temperature Reading',
              body: `Current temperature: ${nextTemperature.toFixed(1)}°C`,
              type: 'Temperature',
              timestamp: Date.now(),
              unread: true,
              iconColor: '#E53935',
              iconBg: '#FFEBEE',
            }).catch((error) => {
              console.error('Failed to create temperature notification:', error);
            });
          }
        }
      },
      (error) => {
        console.error('Firebase DB Error:', error);
      }
    );

    return () => unsubscribe();
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