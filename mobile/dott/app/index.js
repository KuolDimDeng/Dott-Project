import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      // Simulate an asynchronous login check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Replace this with your actual login check
      const isLoggedIn = false;

      if (isLoggedIn) {
        router.replace('/MenuPage');
      } else {
        router.replace('/login');
      }
    };

    checkLoginStatus();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>
  );
}