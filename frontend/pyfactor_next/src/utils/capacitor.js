import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return Capacitor.getPlatform(); // 'ios', 'android', or 'web'
};

export const initializeApp = async () => {
  if (!isNativePlatform()) return;

  // Hide splash screen
  await SplashScreen.hide();

  // Configure status bar
  if (getPlatform() === 'ios') {
    await StatusBar.setStyle({ style: 'LIGHT' });
  }

  // Setup push notifications
  await setupPushNotifications();

  // Handle app state changes
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active?', isActive);
  });

  // Handle deep links
  App.addListener('appUrlOpen', (data) => {
    console.log('App opened with URL:', data.url);
    // Handle deep link navigation
  });
};

const setupPushNotifications = async () => {
  // Request permission
  const permStatus = await PushNotifications.requestPermissions();
  
  if (permStatus.receive === 'granted') {
    // Register with Apple/Google
    await PushNotifications.register();
  }

  // Handle registration success
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token: ' + token.value);
    // Send token to your server
  });

  // Handle incoming notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ', notification);
  });
};