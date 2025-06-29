import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { tokenStorage } from '../../../shared/utils/storage';
import { apiClient } from '../../../shared/api/client';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = 'auth.dottapps.com';
const AUTH0_CLIENT_ID = '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF';
const redirectUri = 'dott://redirect';

// Auth0 endpoints
const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
};

const Auth0LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      responseType: 'code',
      extraParams: {
        audience: 'https://api.dottapps.com',
      },
    },
    discovery
  );

  // Auto-trigger login when request is ready
  useEffect(() => {
    if (request) {
      promptAsync();
      setIsLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleAuthCode(code);
    } else if (response?.type === 'error') {
      Alert.alert('Authentication Error', response.error?.message || 'Something went wrong');
      setIsLoading(false);
    } else if (response?.type === 'dismiss') {
      // User cancelled - show the login button again
      setIsLoading(false);
    }
  }, [response]);

  const handleAuthCode = async (code: string) => {
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: AUTH0_CLIENT_ID,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokens = await tokenResponse.json();
      
      // Store token
      await tokenStorage.setToken(tokens.access_token);
      apiClient.setToken(tokens.access_token);

      // Get user info
      const userResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (userResponse.ok) {
        const userInfo = await userResponse.json();
        
        // Navigate to dashboard
        navigation.navigate('Dashboard' as never);
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      Alert.alert('Login Failed', 'Could not complete authentication');
    }
  };

  const handleLogin = () => {
    promptAsync();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Dott</Text>
            <Text style={styles.tagline}>Business Management Made Simple</Text>
          </View>
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          <Text style={styles.loadingText}>Redirecting to login...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Dott</Text>
          <Text style={styles.tagline}>Business Management Made Simple</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Please sign in to continue</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={!request}
          >
            <Text style={styles.buttonText}>Sign in with Dott</Text>
          </TouchableOpacity>

          <Text style={styles.secureText}>
            Secure authentication powered by Auth0
          </Text>
        </View>
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
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secureText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default Auth0LoginScreen;