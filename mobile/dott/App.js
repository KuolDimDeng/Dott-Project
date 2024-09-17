import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      // Simulate a delay for splash screen (can be replaced with actual initialization logic)
      setTimeout(async () => {
        // Check if token exists to bypass login
        const token = await AsyncStorage.getItem('token');
        if (token) {
          router.replace('/MenuPage'); // Assuming a menu page for logged-in users
        } else {
          router.replace('/Login'); // Navigate to login if not logged in
        }
      }, 3000); // Show splash screen for 3 seconds
    };

    checkLogin();
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Show the splash screen during loading */}
      <ActivityIndicator size="large" color="#0000FF" />
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
