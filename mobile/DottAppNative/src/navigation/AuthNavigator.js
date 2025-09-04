import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EntryScreen from '../screens/auth/EntryScreen';
import LoginOptionsScreen from '../screens/auth/LoginOptionsScreen';
import SignupOptionsScreen from '../screens/auth/SignupOptionsScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' }
      }}
      initialRouteName="Entry"
    >
      <Stack.Screen name="Entry" component={EntryScreen} />
      <Stack.Screen name="LoginOptions" component={LoginOptionsScreen} />
      <Stack.Screen name="SignupOptions" component={SignupOptionsScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}