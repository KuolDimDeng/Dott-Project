import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApi } from '../components/utils/axiosConfig';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          console.log('Attempting login', { email, retryCount: retries });
          const response = await useApi.post('/users/token/', { email, password });

          if (response && response.data && response.data.access) {
            await AsyncStorage.setItem('token', response.data.access);
            await AsyncStorage.setItem('refreshToken', response.data.refresh);
            
            console.log('Login successful, fetching user profile');
            const profileResponse = await useApi.get('/users/profile/');
            const fullName = `${profileResponse.data.first_name} ${profileResponse.data.last_name}`;
            await AsyncStorage.setItem('userFullName', fullName);

            console.log('Login and profile fetch successful');
            navigation.replace('MenuPage');
            return;
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          retries++;
          if (retries === MAX_RETRIES) {
            throw error;
          } else {
            console.warn(`Login attempt failed, retrying (${retries}/${MAX_RETRIES})`, { error: error.message });
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          }
        }
      }
    } catch (error) {
      console.error('Login failed', { error: error.message });
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.innerContainer}>
          <Text style={styles.title}>Sign In</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRegister}>
            <Text style={styles.register}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  forgotPassword: {
    marginTop: 15,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  register: {
    marginTop: 15,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

export default Login;