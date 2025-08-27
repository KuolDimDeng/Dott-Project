# Fix Splash Screen Logo Size

## The Problem
Your splash screen logo appears too large on the screen because the logo fills most of the 2732x2732px image.

## The Solution
You need to resize your splash.png with proper padding:

### Recommended Dimensions:
- **Canvas Size**: 2732 x 2732 pixels (keep this)
- **Logo Size**: 600 x 600 pixels (centered)
- **Padding**: At least 1000px on all sides

### How to Fix:

#### Option 1: Using Preview (Mac)
1. Open `~/Downloads/Splash.png` in Preview
2. Tools → Adjust Size → Set to 2732x2732
3. Create a new image with your gradient background at 2732x2732
4. Paste your logo in the center at about 600x600 pixels
5. Save as `resources/splash.png`

#### Option 2: Using Online Tool
1. Go to https://www.photopea.com (free Photoshop alternative)
2. Create new document: 2732 x 2732 pixels
3. Fill with your gradient background
4. Place your logo in center at ~600px size
5. Export as PNG

#### Option 3: Command Line (ImageMagick)
```bash
# Install ImageMagick if needed
brew install imagemagick

# Resize logo and add padding
convert ~/Downloads/Splash.png \
  -resize 600x600 \
  -gravity center \
  -background "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" \
  -extent 2732x2732 \
  resources/splash-fixed.png
```

### After Fixing:
1. Save the new splash as `resources/splash.png`
2. Regenerate assets:
```bash
npx capacitor-assets generate --splash
```
3. Copy to iOS:
```bash
npx cap copy ios
```
4. Run simulator again