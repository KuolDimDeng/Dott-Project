import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import Auth0LoginScreen from './src/screens/Auth0LoginScreen';
import SimpleAuth0LoginScreen from './src/screens/SimpleAuth0LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { AuthProvider } from './src/context/AuthContext';

const Stack = createStackNavigator();

export default function App() {
  // Use simple Auth0 login for testing - switch this to test different login methods
  const USE_SIMPLE_AUTH = true;
  const USE_AUTH0_LOGIN = true;
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen 
              name="Login" 
              component={USE_SIMPLE_AUTH ? SimpleAuth0LoginScreen : (USE_AUTH0_LOGIN ? Auth0LoginScreen : LoginScreen)} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ 
                title: 'Dashboard',
                headerLeft: null,
                gestureEnabled: false
              }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
