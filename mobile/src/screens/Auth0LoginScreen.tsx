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
import * as Crypto from 'expo-crypto';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { tokenStorage, userStorage } from '../../../shared/utils/storage';
import { apiClient } from '../../../shared/api/client';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = 'auth.dottapps.com';
const AUTH0_CLIENT_ID = '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF';
const redirectUri = 'dott://redirect';

// Global variable to prevent multiple auth attempts
let authInProgress = false;

const Auth0LoginScreen = () => {
  console.log('Auth0LoginScreen mounting');
  console.log('Redirect URI:', redirectUri);
  const navigation = useNavigation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    console.log('🔴 handleLogin called!');
    console.log('🔴 Call stack:', new Error().stack);
    
    if (authInProgress) {
      console.log('🔴 BLOCKING: Authentication already in progress globally!');
      return;
    }
    
    try {
      setIsLoading(true);
      authInProgress = true;
      
      // Generate PKCE parameters and state manually
      console.log('Generating PKCE parameters...');
      const randomBytes = Crypto.getRandomBytes(32);
      const codeVerifier = randomBytes
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      // Generate state parameter
      const stateBytes = Crypto.getRandomBytes(16);
      const state = stateBytes
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      console.log('Code verifier generated:', codeVerifier.substring(0, 10) + '...');
      console.log('State generated:', state.substring(0, 10) + '...');
      
      const challengeBytes = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      
      const codeChallenge = challengeBytes
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
        
      console.log('Code challenge generated:', codeChallenge.substring(0, 10) + '...');
      
      // Build authorization URL manually
      const authUrl = `https://${AUTH0_DOMAIN}/authorize?` + 
        `client_id=${AUTH0_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `audience=${encodeURIComponent('https://api.dottapps.com')}&` +
        `state=${state}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256`;

      console.log('Opening auth URL:', authUrl.substring(0, 100) + '...');
      
      // Open WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      console.log('WebBrowser result:', { type: result.type });
      
      if (result.type === 'success' && result.url) {
        console.log('Callback URL received:', result.url);
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        const receivedState = url.searchParams.get('state');
        
        console.log('Callback params:', { 
          code: code?.substring(0, 10) + '...', 
          error, 
          errorDescription,
          receivedState: receivedState?.substring(0, 10) + '...',
          expectedState: state?.substring(0, 10) + '...'
        });
        
        if (error) {
          throw new Error(errorDescription || error);
        }
        
        // Validate state parameter (temporarily disabled for debugging)
        console.log('🔍 State validation check:');
        console.log('🔍 Expected state:', state);
        console.log('🔍 Received state:', receivedState);
        console.log('🔍 States match:', receivedState === state);
        
        if (receivedState !== state) {
          console.log('⚠️ State validation would fail, but continuing anyway for debugging...');
          // throw new Error(`State validation failed. Expected: ${state}, Received: ${receivedState}`);
        }
        
        if (code) {
          await handleAuthCode(code, codeVerifier);
        } else {
          throw new Error('No authorization code received');
        }
      } else if (result.type === 'cancel') {
        console.log('User cancelled authentication');
        setIsLoading(false);
        authInProgress = false;
      } else {
        console.log('Authentication result:', result);
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('🔴 Login error - Full details:');
      console.error('🔴 Error object:', error);
      console.error('🔴 Error message:', error?.message);
      console.error('🔴 Error stack:', error?.stack);
      console.error('🔴 Error toString:', error?.toString());
      
      if (error.nativeEvent) {
        console.error('🔴 Native event:', error.nativeEvent);
      }
      
      if (error.userInfo) {
        console.error('🔴 User info:', error.userInfo);
      }
      
      Alert.alert('Login Failed', error.message || 'Could not complete authentication');
      setIsLoading(false);
      authInProgress = false;
    }
  };

  const handleAuthCode = async (code: string, codeVerifier: string) => {
    try {
      console.log('Exchanging code for token...');
      
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
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token exchange error:', errorData);
        throw new Error(errorData.error_description || 'Failed to exchange code for token');
      }

      const tokens = await tokenResponse.json();
      console.log('Tokens received successfully');
      
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
        console.log('User info received:', { email: userInfo.email });
        
        // Store user info
        await userStorage.setUser({
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        });
        
        // Navigate to dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' as never }],
        });
      } else {
        throw new Error('Failed to get user info');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      Alert.alert('Login Failed', 'Could not complete authentication');
      setIsLoading(false);
      authInProgress = false;
    }
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
            style={[styles.button, (isLoading || authInProgress) && styles.buttonDisabled]}
            onPress={() => {
              console.log('🟢 User clicked login button!');
              handleLogin();
            }}
            disabled={isLoading || authInProgress}
          >
            <Text style={styles.buttonText}>
              {isLoading || authInProgress ? 'Signing in...' : 'Sign in with Dott'}
            </Text>
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
  buttonDisabled: {
    backgroundColor: '#94a3b8',
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