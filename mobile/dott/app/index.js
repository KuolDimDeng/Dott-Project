import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          router.replace('/MenuPage');
        } else {
          router.replace('/auth/signin');
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        router.replace('/auth/signin');
      }
    };

    checkLoginStatus();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000FF" />
      <Text>Loading...</Text>
    </View>
  );
}