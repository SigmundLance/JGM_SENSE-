import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

interface LoadingScreenProps {
  onLayoutComplete: () => void;
}

export default function LoadingScreen({ onLayoutComplete }: LoadingScreenProps) {
  useEffect(() => {
    // Hold the loading screen for 4 seconds
    const timer = setTimeout(() => {
      onLayoutComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onLayoutComplete]);

  return (
    <View style={styleSheet.container}>
      <LinearGradient
        colors={['#E58793', '#F2A3B0', '#F7BCC5']}
        style={styleSheet.gradient}
      >
        <View style={styleSheet.logoContainer}>
          <Image
            source={require('../assets/images/OINKY_FINAL.gif')}
            style={styleSheet.gifStyle}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styleSheet = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: width * 0.5,
    height: width * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifStyle: {
    width: '100%',
    height: '100%',
  },
});