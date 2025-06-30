import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = 'auth.dottapps.com';
const AUTH0_CLIENT_ID = '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF';
const redirectUri = 'dott://redirect';

const SimpleAuth0LoginScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔵 Starting simple Auth0 flow...');
      
      // Simple auth URL without PKCE (implicit flow)
      const authUrl = `https://${AUTH0_DOMAIN}/authorize?` + 
        `client_id=${AUTH0_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `audience=${encodeURIComponent('https://api.dottapps.com')}`;

      console.log('🔵 Auth URL:', authUrl);
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      console.log('🔵 WebBrowser result:', result);
      
      if (result.type === 'success' && result.url) {
        console.log('🔵 Success URL:', result.url);
        
        // Parse URL fragment for tokens (implicit flow)
        const url = result.url;
        const fragment = url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const error = params.get('error');
          
          console.log('🔵 Parsed params:', { 
            hasAccessToken: !!accessToken, 
            error,
            fragment: fragment.substring(0, 100) + '...'
          });
          
          if (error) {
            throw new Error(params.get('error_description') || error);
          }
          
          if (accessToken) {
            console.log('🔵 Access token received, navigating to dashboard...');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Dashboard' as never }],
            });
          } else {
            throw new Error('No access token received');
          }
        } else {
          throw new Error('No URL fragment received');
        }
      } else if (result.type === 'cancel') {
        console.log('🔵 User cancelled');
        setIsLoading(false);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('🔴 Simple auth error:', error);
      Alert.alert('Login Failed', error.message || 'Could not complete authentication');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Authenticating...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Dott</Text>
          <Text style={styles.tagline}>Simple Auth Test</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Signing in...' : 'Test Simple Auth'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SimpleAuth0LoginScreen;