import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { CardStyleInterpolators } from '@react-navigation/stack';

import ErrorBoundary from './Dott/components/ErrorBoundary';

import SplashScreen from './Dott/components/SplashScreen';
import LoginScreen from './Dott/components/LoginScreen';
import MenuScreen from './Dott/components/MenuScreen';

const Stack = createStackNavigator();

function App() {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Menu" component={MenuScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

export default App;