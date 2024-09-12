import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../components/utils/axiosConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await axiosInstance.post('/api/token/', {
        email,
        password,
      });

      if (response.data.access) {
        await AsyncStorage.setItem('token', response.data.access);
        await AsyncStorage.setItem('refreshToken', response.data.refresh);
        
        // Fetch user profile after successful login
        const profileResponse = await axiosInstance.get('/api/profile/');
        const fullName = `${profileResponse.data.first_name} ${profileResponse.data.last_name}`;
        await AsyncStorage.setItem('userFullName', fullName);

        router.replace('/MenuPage');
      }
    } catch (error) {
      setError('Invalid credentials. Please try again.');
      console.error('Login error:', error.response ? error.response.data : error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Sign In</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Login" onPress={handleLogin} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
      <Text style={styles.copyright}>© {new Date().getFullYear()} Pyfactor</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
  copyright: {
    textAlign: 'center',
    color: 'gray',
    marginBottom: 10,
  },
});