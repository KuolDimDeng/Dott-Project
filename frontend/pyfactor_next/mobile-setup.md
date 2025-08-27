# 📱 Dott Mobile App Setup Guide (iOS & Android)

## Prerequisites
- ✅ Apple Developer Account ($99/year) - DONE
- ⚠️ Google Play Developer Account ($25 one-time) - NEEDED
- Node.js 18+
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

## Step 1: Install Capacitor

```bash
cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# Install Capacitor
pnpm add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# Install essential plugins
pnpm add @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen @capacitor/push-notifications @capacitor/camera @capacitor/filesystem

# Initialize Capacitor
npx cap init
```

When prompted:
- App name: `Dott`
- App Package ID: `com.dottapps.mobile`

## Step 2: Configure Capacitor

Create/update `capacitor.config.json`:

```json
{
  "appId": "com.dottapps.mobile",
  "appName": "Dott",
  "webDir": "out",
  "server": {
    "androidScheme": "https",
    "iosScheme": "https",
    "hostname": "app.dottapps.com"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#2563eb",
      "showSpinner": false,
      "androidSpinnerStyle": "small",
      "iosSpinnerStyle": "small"
    },
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  },
  "ios": {
    "contentInset": "automatic",
    "preferredContentMode": "mobile"
  },
  "android": {
    "buildOptions": {
      "keystorePath": "./android/keystore/release.keystore",
      "keystoreAlias": "dott"
    }
  }
}
```

## Step 3: Prepare Next.js for Static Export

Update `next.config.js`:

```javascript
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  // Disable features that don't work with static export
  experimental: {
    appDir: true
  }
}
```

## Step 4: Add Mobile-Specific Code

Create `src/utils/capacitor.js`:

```javascript
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
```

## Step 5: Build and Add Platforms

```bash
# Build Next.js
pnpm build
pnpm export

# Add platforms
npx cap add ios
npx cap add android

# Copy web assets to native platforms
npx cap copy

# Sync native plugins
npx cap sync
```

## Step 6: iOS Setup

### Open in Xcode:
```bash
npx cap open ios
```

### In Xcode:
1. Select your team in Signing & Capabilities
2. Update Bundle Identifier: `com.dottapps.mobile`
3. Add capabilities:
   - Push Notifications
   - Background Modes (Remote notifications)
   - Sign in with Apple
   - Associated Domains (for deep links)

### Create App ID in Apple Developer:
1. Go to Identifiers → +
2. Select "App IDs" → Continue
3. Select "App" → Continue
4. Fill in:
   - Description: "Dott Mobile"
   - Bundle ID: Explicit → `com.dottapps.mobile`
5. Enable capabilities:
   - Push Notifications
   - Sign In with Apple
   - Associated Domains

## Step 7: Android Setup

### Open in Android Studio:
```bash
npx cap open android
```

### Generate Signing Key:
```bash
cd android
keytool -genkey -v -keystore ./app/release.keystore -alias dott -keyalg RSA -keysize 2048 -validity 10000
```

### Configure `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.dottapps.mobile"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword "YOUR_PASSWORD"
            keyAlias "dott"
            keyPassword "YOUR_PASSWORD"
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 8: App Icons and Splash Screens

### Install icon/splash generator:
```bash
pnpm add -D @capacitor/assets
```

### Create source images:
- `resources/icon.png` (1024x1024px)
- `resources/splash.png` (2732x2732px)

### Generate all sizes:
```bash
npx capacitor-assets generate
```

## Step 9: Test on Devices

### iOS Simulator:
```bash
npx cap run ios
```

### Android Emulator:
```bash
npx cap run android
```

### Real Device Testing:
1. iOS: Use Xcode to deploy to connected iPhone
2. Android: Enable USB debugging and use Android Studio

## Step 10: App Store Submission

### iOS (App Store Connect):
1. Create app in App Store Connect
2. Fill in app information
3. Upload screenshots (6.7", 6.5", 5.5")
4. Archive in Xcode → Distribute App
5. Submit for review

### Android (Google Play Console):
1. Create app in Play Console
2. Fill in store listing
3. Upload screenshots
4. Build signed APK/AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
5. Upload to Production/Beta track

## Development Workflow

### After making changes:
```bash
# Rebuild Next.js
pnpm build && pnpm export

# Copy to native platforms
npx cap copy

# Or live reload for development
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

## Native Features Implementation

### Biometric Authentication:
```bash
pnpm add @capacitor-community/face-id @capacitor-community/fingerprint
```

### Barcode/QR Scanning:
```bash
pnpm add @capacitor-community/barcode-scanner
```

### In-App Purchases:
```bash
pnpm add @capacitor-community/in-app-purchases
```

### Social Login:
```bash
pnpm add @capacitor-community/apple-sign-in
pnpm add @codetrix-studio/capacitor-google-auth
```

## Troubleshooting

### Common Issues:

1. **Build fails with "Module not found"**
   - Run `npx cap sync` instead of just `copy`

2. **iOS: Signing errors**
   - Ensure certificates are in Keychain
   - Check provisioning profiles in Xcode

3. **Android: Build fails**
   - Check Android SDK version
   - Run `cd android && ./gradlew clean`

4. **Push notifications not working**
   - iOS: Check certificates and capabilities
   - Android: Add google-services.json

5. **Deep links not working**
   - iOS: Check Associated Domains
   - Android: Check intent filters in AndroidManifest.xml

## Performance Tips

1. **Optimize bundle size**:
   ```javascript
   // next.config.js
   module.exports = {
     experimental: {
       optimizeCss: true,
     },
     compiler: {
       removeConsole: process.env.NODE_ENV === 'production',
     }
   }
   ```

2. **Preload critical data**:
   - Cache API responses
   - Use IndexedDB for offline storage

3. **Native transitions**:
   - Use Capacitor's native page transitions
   - Avoid heavy animations on older devices

## Monitoring & Analytics

Add mobile analytics:
```bash
pnpm add @capacitor-community/firebase-analytics
```

Track app metrics:
- Install/uninstall rates
- Session duration
- Screen views
- Crashes (use Sentry)
- User engagement

## Next Steps

1. Set up CI/CD with Fastlane
2. Implement CodePush for OTA updates
3. Add App Store optimization (ASO)
4. Set up crash reporting (Sentry/Firebase Crashlytics)
5. Implement app rating prompts
6. Add app shortcuts (iOS) and App Shortcuts (Android)