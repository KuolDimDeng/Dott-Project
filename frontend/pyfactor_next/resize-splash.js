const sharp = require('sharp');
const path = require('path');

async function resizeSplashLogo() {
  const inputPath = path.join(__dirname, 'resources', 'splash.png');
  const outputPath = path.join(__dirname, 'resources', 'splash-resized.png');
  
  try {
    // Create a 2732x2732 canvas with the logo centered and scaled down
    await sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      }
    })
    .composite([{
      input: await sharp(inputPath)
        .resize(600, 600, { // Reduce logo to 600x600 (much smaller)
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toFile(outputPath);
    
    console.log('✅ Splash screen resized successfully!');
    console.log('Logo is now 600x600px centered in 2732x2732px canvas');
    
    // Now rename to replace original
    const fs = require('fs');
    fs.renameSync(outputPath, inputPath);
    console.log('✅ Original splash.png replaced with resized version');
    
  } catch (error) {
    console.error('Error resizing splash:', error);
  }
}

resizeSplashLogo();