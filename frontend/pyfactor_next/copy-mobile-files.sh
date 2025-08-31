#!/bin/bash

# Script to copy updated mobile HTML files to Capacitor projects
echo "📱 Copying updated mobile files to Capacitor projects..."

# Base directories
SOURCE_DIR="./out"
IOS_DIR="./ios/App/App/public"
ANDROID_DIR="./android/app/src/main/assets/public"

# Files to copy
FILES=(
    "mobile-menu.html"
    "mobile-smart-insights.html"
    "mobile-services.html"
    "mobile-pos.html"
    "mobile-dashboard.html"
    "mobile-auth.html"
    "mobile-timesheet.html"
    "mobile-paystubs.html"
    "mobile-transactions.html"
    "mobile-staff.html"
    "mobile-expenses.html"
    "mobile-inventory.html"
    "mobile-profile.html"
    "mobile-settings.html"
    "mobile-banking.html"
    "mobile-whatsapp.html"
    "mobile-call-screen.html"
    "mobile-chat.html"
    "mobile-contacts.html"
    "invite.html"
    "index.html"
    "jobs.html"
)

# Copy to iOS if directory exists
if [ -d "$IOS_DIR" ]; then
    echo "📋 Copying files to iOS project..."
    for file in "${FILES[@]}"; do
        if [ -f "$SOURCE_DIR/$file" ]; then
            cp "$SOURCE_DIR/$file" "$IOS_DIR/$file"
            echo "  ✅ Copied $file to iOS"
        else
            echo "  ⚠️  File not found: $file"
        fi
    done
else
    echo "❌ iOS directory not found at $IOS_DIR"
fi

# Copy to Android if directory exists
if [ -d "$ANDROID_DIR" ]; then
    echo "📋 Copying files to Android project..."
    for file in "${FILES[@]}"; do
        if [ -f "$SOURCE_DIR/$file" ]; then
            cp "$SOURCE_DIR/$file" "$ANDROID_DIR/$file"
            echo "  ✅ Copied $file to Android"
        else
            echo "  ⚠️  File not found: $file"
        fi
    done
else
    echo "❌ Android directory not found at $ANDROID_DIR"
fi

echo ""
echo "🔄 Running Capacitor sync..."
npx cap sync

echo ""
echo "✨ Files copied successfully!"
echo ""
echo "Next steps:"
echo "1. For iOS: Open Xcode and run the project, or use: npx cap run ios"
echo "2. For Android: Open Android Studio and run the project, or use: npx cap run android"
echo ""
echo "⚠️  Make sure to rebuild the app to see the changes!"