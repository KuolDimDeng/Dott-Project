import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const checkLoginStatus = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token ? 'MenuPage' : 'Login';
  } catch (error) {
    console.error('Error checking login status:', error);
    return 'Login';
  }
};

export default function App() {
  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      // Simulate a delay for splash screen (can be replaced with actual initialization logic)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const initialRoute = await checkLoginStatus();
      router.replace(`/${initialRoute}`);
    };

    initializeApp();
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Show the splash screen during loading */}
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0000FF', // Splash background color (blue)
  },
});