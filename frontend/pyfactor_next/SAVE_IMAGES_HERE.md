# Save Your App Images

Please save the images you provided as follows:

1. **App Icon (Second image - the square Dott logo)**:
   - Save as: `resources/icon.png`
   - Requirements: 1024x1024px minimum, PNG format, no transparency
   - This is the app icon that will appear on home screens

2. **Splash Screen (First image - the Dott logo on gradient background)**:
   - Save as: `resources/splash.png`
   - Requirements: 2732x2732px minimum, PNG format
   - This will be shown when the app launches

## After Saving the Images

Run this command to generate all required sizes:

```bash
npx capacitor-assets generate
```

This will create:
- iOS app icons in various sizes
- Android app icons for different screen densities
- Splash screens for all device sizes

## Manual Alternative

If the automatic generation doesn't work, you can manually place the images in:

### iOS
- Icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Splash: `ios/App/App/Assets.xcassets/Splash.imageset/`

### Android
- Icons: `android/app/src/main/res/mipmap-*/`
- Splash: `android/app/src/main/res/drawable*/`