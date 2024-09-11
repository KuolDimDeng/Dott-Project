// src/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    console.log('SplashScreen mounted');
    checkTokenAndNavigate();
  }, []);

  const checkTokenAndNavigate = async () => {
    try {
      // Simulate a delay to show the splash screen (adjust as needed)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const token = await AsyncStorage.getItem('token');

      if (token) {
        navigation.replace('Menu');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error checking token:', error);
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.jpg')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Or any color that matches your brand
  },
  logo: {
    width: 200, // Adjust size as needed
    height: 200, // Adjust size as needed
  },
});

export default SplashScreen;