import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dottapps.mobile',
  appName: 'Dott',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.dottapps.com'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SecureStorage: {
      encrypt: true,
      keychainService: 'com.dottapps.mobile.keychain',
      sharedPreferencesName: 'com.dottapps.mobile.secure'
    }
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  },
  android: {
    buildOptions: {
      keystorePath: './android/keystore/release.keystore',
      keystoreAlias: 'dott'
    }
  }
};

export default config;
