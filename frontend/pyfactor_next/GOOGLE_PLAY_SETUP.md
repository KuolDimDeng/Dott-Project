# Google Play Store Setup Guide

## Prerequisites
- [ ] Google Play Developer Account ($25 one-time fee)
- [ ] Android Studio installed
- [ ] Java Development Kit (JDK) installed

## Current Status
✅ Capacitor installed and configured
✅ Android app structure created
✅ Native plugins configured

## Setup Steps

### 1. Create Google Play Developer Account
1. Go to https://play.google.com/console/signup
2. Pay the $25 registration fee
3. Complete identity verification
4. Wait for approval (usually within 48 hours)

### 2. Generate Signing Key
```bash
cd /Users/kuoldeng/projectx/frontend/pyfactor_next/android
mkdir -p app/keystore
keytool -genkey -v -keystore app/keystore/release.keystore -alias dott -keyalg RSA -keysize 2048 -validity 10000
```

**IMPORTANT**: Store the keystore password securely! You'll need it for all future updates.

Suggested keystore details:
- Keystore password: (use a strong password)
- Key alias: dott
- Key password: (same as keystore password)
- Name: Dott Apps
- Organizational Unit: Mobile Development
- Organization: Dott Apps Inc
- City: Your City
- State: Your State
- Country: US (or your country code)

### 3. Configure Gradle for Release Signing

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("keystore/release.keystore")
            storePassword "YOUR_KEYSTORE_PASSWORD"
            keyAlias "dott"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Security Note**: For production, use gradle.properties or environment variables instead of hardcoding passwords.

### 4. Update App Configuration

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">Dott</string>
    <string name="title_activity_main">Dott</string>
    <string name="package_name">com.dottapps.mobile</string>
    <string name="custom_url_scheme">com.dottapps.mobile</string>
</resources>
```

### 5. Set Version Information

In `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.dottapps.mobile"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1  // Increment for each release
        versionName "1.0.0"  // User-visible version
    }
}
```

### 6. Build the App

#### Build APK (for testing):
```bash
cd android
./gradlew assembleRelease
```
Output: `app/build/outputs/apk/release/app-release.apk`

#### Build AAB (for Play Store):
```bash
cd android
./gradlew bundleRelease
```
Output: `app/build/outputs/bundle/release/app-release.aab`

### 7. Test the Release Build
```bash
# Install on connected device
adb install app/build/outputs/apk/release/app-release.apk

# Or use bundletool for AAB testing
java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app-release.apks
java -jar bundletool.jar install-apks --apks=app-release.apks
```

### 8. Create App in Google Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - App name: Dott
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
   - Accept declarations

### 9. Prepare Store Listing

#### Required Graphics:
Place in `resources/android/` folder:
- **App Icon**: 512x512px PNG
- **Feature Graphic**: 1024x500px PNG (optional but recommended)
- **Phone Screenshots**: 2-8 images
  - Min dimensions: 320px
  - Max dimensions: 3840px
  - 16:9 or 9:16 aspect ratio recommended
- **Tablet Screenshots**: 2-8 images (optional)
  - 7" tablets: 1024x600
  - 10" tablets: 1280x800

#### Store Information:
- **Short Description** (80 characters max):
  "AI-powered business management platform for global enterprises"

- **Full Description** (4000 characters max):
  ```
  Dott is a comprehensive business management platform that brings AI-powered intelligence to your everyday operations.

  KEY FEATURES:
  • Accounting & Finance Management
  • Inventory & Stock Control
  • HR & Payroll Processing
  • CRM & Customer Management
  • Point of Sale (POS) System
  • Multi-currency Support (170+ currencies)
  • Real-time Analytics & Reporting
  • Mobile-first Design
  • Offline Capabilities
  • Secure Cloud Sync

  PERFECT FOR:
  • Small to Medium Businesses
  • Retail Stores
  • Service Companies
  • Restaurants & Cafes
  • Professional Services
  • Global Enterprises

  WHY CHOOSE DOTT:
  • AI-powered insights and predictions
  • User-friendly interface
  • Bank-grade security
  • 24/7 customer support
  • Regular updates and new features
  • Affordable pricing plans
  • No hidden fees

  Get started with Dott today and transform how you manage your business!
  ```

- **Category**: Business
- **Tags**: business, accounting, inventory, payroll, CRM, POS

### 10. Content Rating
Complete the content rating questionnaire:
- Violence: None
- Sexual Content: None
- Language: None
- Controlled Substances: None
- Target Age: 18+ (business app)

### 11. Pricing & Distribution
- **Countries**: Select all countries where you want to distribute
- **Price**: Free (with in-app purchases if applicable)
- **Contains ads**: No
- **Content guidelines**: Accept all

### 12. App Content
- **Privacy Policy URL**: https://dottapps.com/privacy
- **Terms of Service**: https://dottapps.com/terms
- **Data Safety**: Complete the data safety form
  - Data collected: User info, Financial info, etc.
  - Data sharing: Not shared with third parties
  - Security: Data encrypted in transit

### 13. Upload Your App

#### Internal Testing (Recommended first):
1. Go to **Release** → **Testing** → **Internal testing**
2. Create a new release
3. Upload your AAB file
4. Add release notes
5. Add tester emails
6. Start rollout

#### Production Release:
1. Go to **Release** → **Production**
2. Create a new release
3. Upload your AAB file
4. Add release notes:
   ```
   Version 1.0.0
   - Initial release
   - AI-powered business management
   - Multi-currency support
   - Offline capabilities
   ```
5. Review and rollout (can do staged rollout)

### 14. Common Issues & Solutions

#### Issue: "Upload failed: Version code already exists"
**Solution**: Increment `versionCode` in `build.gradle`

#### Issue: "APK signature verification failed"
**Solution**: Ensure you're using the same keystore for all builds

#### Issue: "Your app targets an old version of Android"
**Solution**: Update `targetSdkVersion` to latest (currently 34)

#### Issue: App crashes on launch
**Solution**: Check ProGuard rules, might be removing necessary code

### 15. Post-Launch Tasks
- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews
- [ ] Track installation and uninstall metrics
- [ ] Plan regular updates
- [ ] A/B test store listing elements
- [ ] Set up Google Play Console API for automation

## Build Commands Reference

```bash
# Development build
cd android && ./gradlew assembleDebug

# Release APK
cd android && ./gradlew assembleRelease

# Release Bundle (AAB)
cd android && ./gradlew bundleRelease

# Clean build
cd android && ./gradlew clean

# Run on emulator
npx cap run android

# Run on device
npx cap run android --device

# Open in Android Studio
npx cap open android
```

## Security Best Practices
1. Never commit keystore files to version control
2. Use Play App Signing for added security
3. Enable ProGuard/R8 for code obfuscation
4. Implement certificate pinning for API calls
5. Use Android Keystore for sensitive data
6. Regular security audits

## Useful Links
- [Google Play Console](https://play.google.com/console)
- [Android Developer Docs](https://developer.android.com)
- [Material Design Guidelines](https://material.io/design)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Bundle Format](https://developer.android.com/guide/app-bundle)