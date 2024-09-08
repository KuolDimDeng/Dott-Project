import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Button, Text, Alert, TouchableOpacity } from 'react-native';
import axiosInstance from './component/axiosConfig';  // Adjusted import path
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const handleLogin = async () => {
    try {
      const response = await axiosInstance.post('/auth-token/', {
        email: email,
        password: password,
      });

      if (response.status === 200) {
        const { token, refreshToken } = response.data;
        await AsyncStorage.setItem('token', token); // Store token securely in AsyncStorage
        await AsyncStorage.setItem('refreshToken', refreshToken);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Navigate to dashboard or main screen
        navigation.navigate('Dashboard');
      } else {
        setErrorMessage('Invalid response from the server');
      }
    } catch (error) {
      setErrorMessage('Login failed. Please check your credentials.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={(text) => setEmail(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry={true}
        value={password}
        onChangeText={(text) => setPassword(text)}
      />
      <Button title="Login" onPress={handleLogin} />
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.link}>Forgot password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  linksContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
