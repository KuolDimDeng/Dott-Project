# Apple Developer Certificate Setup Guide

## Current Status
✅ Capacitor installed and configured
✅ iOS app structure created
✅ Android app structure created
✅ Native plugins configured

## Next Steps for Apple Developer Portal

### 1. Create App ID (Identifier)
1. Go to https://developer.apple.com/account
2. Navigate to **Certificates, IDs & Profiles** → **Identifiers**
3. Click the **+** button
4. Select **App IDs** → Continue
5. Select **App** → Continue
6. Fill in the following:
   - **Description**: Dott Mobile
   - **Bundle ID**: Explicit → `com.dottapps.mobile`
   - **Capabilities**: Enable the following:
     - ✓ Push Notifications
     - ✓ Sign In with Apple (if using Apple auth)
     - ✓ Associated Domains (for deep links)
     - ✓ In-App Purchase (if needed)
7. Click **Continue** → **Register**

### 2. Create Development Certificate
1. Navigate to **Certificates** → Click **+**
2. Select **iOS App Development** → Continue
3. Follow the instructions to create a CSR (Certificate Signing Request):
   - Open **Keychain Access** on your Mac
   - Menu: Keychain Access → Certificate Assistant → Request a Certificate
   - Fill in your email and name
   - Select "Saved to disk"
   - Save the CSR file
4. Upload the CSR file
5. Download the certificate
6. Double-click to install in Keychain

### 3. Create Distribution Certificate (for App Store)
1. Navigate to **Certificates** → Click **+**
2. Select **iOS Distribution (App Store)** → Continue
3. Follow same CSR process as above
4. Download and install the certificate

### 4. Create Provisioning Profiles

#### Development Profile (for testing)
1. Navigate to **Profiles** → Click **+**
2. Select **iOS App Development** → Continue
3. Select your App ID: `com.dottapps.mobile`
4. Select your development certificate
5. Select your test devices (register them if needed)
6. Name it: "Dott Mobile Development"
7. Download the profile

#### Distribution Profile (for App Store)
1. Navigate to **Profiles** → Click **+**
2. Select **App Store** → Continue
3. Select your App ID: `com.dottapps.mobile`
4. Select your distribution certificate
5. Name it: "Dott Mobile Distribution"
6. Download the profile

### 5. Configure in Xcode
1. Open the iOS app in Xcode:
   ```bash
   npx cap open ios
   ```
2. In Xcode, select your project in the navigator
3. Go to **Signing & Capabilities** tab
4. For both Debug and Release:
   - Check "Automatically manage signing"
   - Select your Team
   - Bundle Identifier should be: `com.dottapps.mobile`

### 6. Add Required Capabilities in Xcode
1. Click **+ Capability** button
2. Add these capabilities:
   - Push Notifications
   - Background Modes (check "Remote notifications")
   - Sign in with Apple (if using)
   - Associated Domains (if using deep links)

### 7. Configure Push Notifications
1. Create an APNs Key in Apple Developer:
   - Navigate to **Keys** → Click **+**
   - Name: "Dott Push Notifications"
   - Check **Apple Push Notifications service (APNs)**
   - Download the .p8 file (save it securely!)
   - Note the Key ID
2. Configure your backend with:
   - Key ID
   - Team ID
   - .p8 file contents

### 8. Test on Real Device
1. Connect your iPhone to your Mac
2. In Xcode, select your device from the device list
3. Click the Run button (▶️)
4. Trust the developer certificate on your iPhone:
   - Settings → General → Device Management → Developer App → Trust

### 9. Prepare for App Store Submission

#### Create App Store Connect Entry
1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: Dott
   - Primary Language: English
   - Bundle ID: Select `com.dottapps.mobile`
   - SKU: dott-mobile-2024

#### Required Assets
Create these assets and place them in the `resources` folder:
- **App Icon**: 1024x1024px PNG (no transparency, no rounded corners)
- **Splash Screen**: 2732x2732px PNG (centered logo on solid background)
- **Screenshots**: 
  - iPhone 6.7" (1290 x 2796): 3-5 screenshots
  - iPhone 6.5" (1242 x 2688): 3-5 screenshots
  - iPhone 5.5" (1242 x 2208): 3-5 screenshots
  - iPad Pro 12.9" (2048 x 2732): Optional

#### App Information
Prepare the following:
- App Description (max 4000 characters)
- Keywords (max 100 characters, comma-separated)
- Support URL
- Marketing URL (optional)
- Privacy Policy URL (required)
- Age Rating questionnaire answers
- Copyright: © 2024 Dott Apps
- Version: 1.0.0
- What's New (release notes)

### 10. Submit to App Store
1. In Xcode, ensure scheme is set to "Any iOS Device"
2. Menu: Product → Archive
3. Wait for archive to complete
4. Click "Distribute App"
5. Select "App Store Connect" → Next
6. Select "Upload" → Next
7. Follow prompts to upload
8. Go to App Store Connect
9. Select your app → Add build
10. Fill in all required information
11. Submit for review

## Common Issues & Solutions

### Issue: "No signing certificate found"
**Solution**: Make sure you've installed both development and distribution certificates in Keychain Access.

### Issue: "Provisioning profile doesn't match"
**Solution**: Download the latest provisioning profiles from Apple Developer portal and install them.

### Issue: "Unable to install on device"
**Solution**: Register your device UDID in Apple Developer portal and regenerate the development provisioning profile.

### Issue: Push notifications not working
**Solution**: Ensure you've enabled Push Notifications capability and configured the APNs key correctly.

## Testing Checklist
- [ ] App launches on simulator
- [ ] App launches on real device
- [ ] Push notifications work (if implemented)
- [ ] Deep links work (if implemented)
- [ ] App performs well on different iOS versions
- [ ] App handles network connectivity changes
- [ ] All features work offline where applicable

## Android (Google Play) Setup
For Android deployment, see `GOOGLE_PLAY_SETUP.md`