#!/bin/bash

# Generate iOS App Icons from source icon
SOURCE_ICON="/Users/kuoldeng/Downloads/icon.png"
ICON_SET_PATH="/Users/kuoldeng/projectx/mobile/DottAppNative/ios/DottAppNative/Images.xcassets/AppIcon.appiconset"

echo "🎨 Generating iOS app icons..."

# Create the AppIcon.appiconset directory if it doesn't exist
mkdir -p "$ICON_SET_PATH"

# Generate all required iOS icon sizes
# iPhone icons
sips -z 40 40 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-20@2x.png"
sips -z 60 60 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-20@3x.png"
sips -z 58 58 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-29@2x.png"
sips -z 87 87 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-29@3x.png"
sips -z 80 80 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-40@2x.png"
sips -z 120 120 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-40@3x.png"
sips -z 120 120 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-60@2x.png"
sips -z 180 180 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-60@3x.png"

# iPad icons
sips -z 20 20 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-20.png"
sips -z 29 29 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-29.png"
sips -z 40 40 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-40.png"
sips -z 76 76 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-76.png"
sips -z 152 152 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-76@2x.png"
sips -z 167 167 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-83.5@2x.png"

# App Store icon
sips -z 1024 1024 "$SOURCE_ICON" --out "$ICON_SET_PATH/Icon-1024.png"

echo "✅ iOS app icons generated successfully!"

# Also update the logo in assets
echo "📱 Updating logo in assets..."
cp "$SOURCE_ICON" "/Users/kuoldeng/projectx/mobile/DottAppNative/src/assets/logo.png"

echo "✅ All icons updated successfully!"