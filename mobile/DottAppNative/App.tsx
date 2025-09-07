import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { BusinessProvider } from './src/context/BusinessContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { MenuProvider } from './src/context/MenuContext';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EnvironmentBadge from './src/components/EnvironmentBadge';
import CallManager from './src/components/CallManager';

const Stack = createStackNavigator();

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BusinessProvider>
          <MenuProvider>
            <CurrencyProvider>
              <CartProvider>
                <CallManager>
                  <View style={{ flex: 1 }}>
                    <AppNavigator />
                    <EnvironmentBadge />
                  </View>
                </CallManager>
              </CartProvider>
            </CurrencyProvider>
          </MenuProvider>
        </BusinessProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}