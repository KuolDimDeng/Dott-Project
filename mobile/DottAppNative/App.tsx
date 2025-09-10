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
import { CountryProvider } from './src/context/CountryContext';
import { StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EnvironmentBadge from './src/components/EnvironmentBadge';
import CallManager from './src/components/CallManager';

const Stack = createStackNavigator();

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#ffffff' 
      }}>
        <Text style={{ 
          fontSize: 24, 
          fontWeight: 'bold', 
          color: '#2563eb',
          marginBottom: 20 
        }}>
          Dott Apps
        </Text>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 3,
          borderColor: '#2563eb',
          borderTopColor: 'transparent',
          backgroundColor: 'transparent'
        }} />
        <Text style={{ 
          marginTop: 20, 
          fontSize: 16, 
          color: '#666' 
        }}>
          Loading...
        </Text>
      </View>
    );
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

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#ffffff',
          padding: 20 
        }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#ef4444',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            Something went wrong
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: '#666',
            textAlign: 'center',
            marginBottom: 20
          }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: '#888',
            textAlign: 'center'
          }}>
            Please restart the app
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <CountryProvider>
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
        </CountryProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}