#!/bin/bash

echo "🚀 Setting up Dott React Native App for iOS"
echo "==========================================="

# Install Node dependencies with pnpm
echo "📦 Installing Node dependencies with pnpm..."
pnpm install

# Install CocoaPods dependencies
echo "🍎 Installing iOS dependencies..."
cd ios
pod install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the app in Xcode:"
echo "1. Open Xcode"
echo "2. File -> Open -> Navigate to: /Users/kuoldeng/projectx/mobile/DottAppNative/ios"
echo "3. Select 'DottAppNative.xcworkspace' (NOT .xcodeproj)"
echo "4. Select your simulator or device"
echo "5. Press the Run button (⌘R)"
echo ""
echo "Or run from terminal:"
echo "pnpm react-native run-ios"
echo ""