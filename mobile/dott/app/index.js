import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to the 'login' screen using expo-router
    router.replace('/login');
  }, [router]);

  return null;
}