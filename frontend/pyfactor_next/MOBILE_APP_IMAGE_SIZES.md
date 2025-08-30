# Mobile App Image Sizes Guide

## Overview
This document contains all the image sizes needed for the Dott mobile app icons and splash screens.

## Main Source Images (Required)
These are the master images you need to create. All other sizes will be generated from these:

### 1. App Icon
- **Location**: `/resources/icon.png`
- **Size**: **1024 x 1024 px**
- **Format**: PNG
- **Notes**: Square image, no transparency for iOS, will be automatically rounded on iOS

### 2. Splash Screen
- **Location**: `/resources/splash.png`
- **Size**: **2732 x 2732 px**
- **Format**: PNG
- **Notes**: Should be designed to work when cropped to various aspect ratios

## Android Specific Sizes

### App Icons (Located in `/android/app/src/main/res/`)
- **ldpi** (mipmap-ldpi): 36 x 36 px
- **mdpi** (mipmap-mdpi): 48 x 48 px
- **hdpi** (mipmap-hdpi): 72 x 72 px
- **xhdpi** (mipmap-xhdpi): 96 x 96 px
- **xxhdpi** (mipmap-xxhdpi): 144 x 144 px
- **xxxhdpi** (mipmap-xxxhdpi): 192 x 192 px

### Splash Screens - Portrait (drawable-port-*)
- **ldpi**: 240 x 320 px
- **mdpi**: 320 x 480 px
- **hdpi**: 480 x 800 px
- **xhdpi**: 720 x 1280 px
- **xxhdpi**: 960 x 1600 px
- **xxxhdpi**: 1280 x 1920 px

### Splash Screens - Landscape (drawable-land-*)
- **ldpi**: 320 x 240 px
- **mdpi**: 480 x 320 px
- **hdpi**: 800 x 480 px
- **xhdpi**: 1280 x 720 px
- **xxhdpi**: 1600 x 960 px
- **xxxhdpi**: 1920 x 1280 px

## iOS Specific Sizes

### App Icon
- **iOS Universal**: 1024 x 1024 px
- Located at: `/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

### Splash Screen
- **iOS Universal**: 2732 x 2732 px
- Located at: `/ios/App/App/Assets.xcassets/Splash.imageset/`
- Files: splash-2732x2732.png (used for @1x, @2x, and @3x)

## How to Replace Images

### Quick Method (Recommended)
1. Create your new images:
   - Icon: 1024 x 1024 px PNG
   - Splash: 2732 x 2732 px PNG

2. Replace the main source files:
   ```bash
   # Replace icon
   cp your-new-icon.png /resources/icon.png
   
   # Replace splash
   cp your-new-splash.png /resources/splash.png
   ```

3. Use Capacitor to regenerate all sizes:
   ```bash
   npx capacitor-assets generate
   ```
   This will automatically generate all required sizes for both iOS and Android.

### Manual Method
If you need to manually replace specific sizes:

1. **For Android Icons**: Replace files in `/android/app/src/main/res/mipmap-*/`
2. **For Android Splash**: Replace files in `/android/app/src/main/res/drawable*/`
3. **For iOS**: Replace files in `/ios/App/App/Assets.xcassets/`

## Design Guidelines

### Icon Design Tips
- Use a simple, recognizable design
- Ensure it's visible at small sizes
- Avoid text if possible
- Use bold colors and shapes
- Test on both light and dark backgrounds

### Splash Screen Design Tips
- Center your logo/branding
- Keep important content in the center (safe area)
- Use a simple background (solid color or gradient)
- Avoid text near edges (will be cropped on different devices)
- Consider both portrait and landscape orientations

## Colors Currently Used
- Background: White (#ffffff)
- Primary Blue: #3B82F6

## Testing
After replacing images:
1. Clean build folders
2. Rebuild the app
3. Test on various device sizes
4. Check both light and dark modes

## Commands to Regenerate
```bash
# Clean and regenerate all assets
npx capacitor-assets generate --iconOnly  # For icons only
npx capacitor-assets generate --splashOnly # For splash only
npx capacitor-assets generate              # For both

# Sync with native projects
npx cap sync

# Build for testing
npm run build
npx cap copy
npx cap open ios     # For iOS
npx cap open android # For Android
```