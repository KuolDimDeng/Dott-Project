#!/bin/bash

# Create a 2732x2732 splash screen with centered logo
# Using ImageMagick (sips doesn't support compositing well)

# First check if we have the logo
if [ ! -f "/Users/kuoldeng/Downloads/Splash.png" ]; then
    echo "Error: Splash.png not found in Downloads"
    exit 1
fi

# Create splash using sips (macOS built-in)
# Create blue background
echo "Creating blue background..."
# We'll use a workaround with sips

# First, let's resize the logo to a good size (500x500) and pad it
sips -z 500 500 /Users/kuoldeng/Downloads/Splash.png --out /tmp/logo-resized.png

# Create a blue square image using a trick with sips
# We'll create it from the logo and then fill it
cp /tmp/logo-resized.png /tmp/splash-temp.png
sips -z 2732 2732 /tmp/splash-temp.png --out /tmp/splash-base.png

# Since sips is limited, let's use a different approach
# Create an HTML canvas and screenshot it
cat > /tmp/create-splash.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; }
        #canvas { 
            width: 2732px; 
            height: 2732px; 
            background: #2563eb;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #logo {
            width: 500px;
            height: 500px;
            background: url('file:///Users/kuoldeng/Downloads/Splash.png') no-repeat center;
            background-size: contain;
        }
    </style>
</head>
<body>
    <div id="canvas">
        <div id="logo"></div>
    </div>
</body>
</html>
EOF

echo "Splash HTML template created at /tmp/create-splash.html"
echo ""
echo "Since we need to composite images, you have two options:"
echo ""
echo "Option 1: Install ImageMagick"
echo "  brew install imagemagick"
echo "  Then run: convert -size 2732x2732 xc:'#2563eb' /tmp/blue-bg.png"
echo "  convert /tmp/blue-bg.png /Users/kuoldeng/Downloads/Splash.png -gravity center -composite resources/splash.png"
echo ""
echo "Option 2: Use an online tool"
echo "  1. Go to https://www.canva.com or any image editor"
echo "  2. Create a 2732×2732px canvas"
echo "  3. Set background to #2563eb"
echo "  4. Place your logo in the center at about 500px size"
echo "  5. Export as PNG"
echo ""
echo "Option 3: Use the generated splash from Capacitor"
echo "  We'll use your small logo and let Capacitor handle it"

# For now, let's just use the resized version
cp /tmp/logo-resized.png resources/splash.png
echo "Created temporary splash.png in resources folder (needs proper sizing)"