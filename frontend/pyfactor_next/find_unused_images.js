const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all image files in public directory
const publicDir = path.join(__dirname, 'public');
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];

function getAllImages(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllImages(filePath, fileList);
    } else if (imageExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
      fileList.push(filePath.replace(publicDir, '').replace(/\\/g, '/'));
    }
  });
  
  return fileList;
}

// Get all references to images in the codebase
function findImageReferences() {
  const srcDir = path.join(__dirname, 'src');
  const appDir = path.join(__dirname, 'app');
  const componentsDir = path.join(__dirname, 'components');
  const pagesDir = path.join(__dirname, 'pages');
  
  const references = new Set();
  
  // Search patterns
  const patterns = [
    'src=',
    'href=',
    'url\\(',
    'import.*from',
    'require\\(',
    'Image.*src=',
    'background.*:.*url',
    '/images/',
    '/static/',
    'favicon',
    'apple-touch-icon',
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.ico'
  ];
  
  // Search in all JS, JSX, TS, TSX, CSS files
  try {
    const searchDirs = [srcDir, appDir, componentsDir, pagesDir].filter(dir => fs.existsSync(dir));
    
    searchDirs.forEach(dir => {
      const command = `grep -r -h -E "(${patterns.join('|')})" "${dir}" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.css" --include="*.scss" --include="*.json" || true`;
      const result = execSync(command, { maxBuffer: 1024 * 1024 * 10 }).toString();
      
      // Extract file paths from the results
      const lines = result.split('\n');
      lines.forEach(line => {
        // Extract paths that look like image references
        const matches = line.match(/["'`]([^"'`]*\.(jpg|jpeg|png|gif|svg|webp|ico))["'`]/gi);
        if (matches) {
          matches.forEach(match => {
            let imagePath = match.replace(/["'`]/g, '');
            
            // Normalize paths
            if (imagePath.startsWith('/')) {
              references.add(imagePath);
            } else if (imagePath.includes('public/')) {
              references.add(imagePath.split('public')[1]);
            } else if (imagePath.includes('static/')) {
              references.add('/' + imagePath.substring(imagePath.indexOf('static/')));
            } else if (imagePath.includes('images/')) {
              references.add('/' + imagePath.substring(imagePath.indexOf('images/')));
            }
          });
        }
        
        // Also check for paths without extensions (for dynamic imports)
        const pathMatches = line.match(/["'`](\/[^"'`]*\/(images|static)[^"'`]*)["'`]/gi);
        if (pathMatches) {
          pathMatches.forEach(match => {
            references.add(match.replace(/["'`]/g, ''));
          });
        }
      });
    });
  } catch (error) {
    console.error('Error searching for references:', error);
  }
  
  return references;
}

// Main function
function findUnusedImages() {
  console.log('Finding all images in public directory...');
  const allImages = getAllImages(publicDir);
  console.log(`Found ${allImages.length} images\n`);
  
  console.log('Searching for image references in codebase...');
  const references = findImageReferences();
  console.log(`Found ${references.size} unique image references\n`);
  
  // Find unused images
  const unusedImages = [];
  const usedImages = [];
  
  allImages.forEach(imagePath => {
    let isUsed = false;
    
    // Check if image is referenced
    references.forEach(ref => {
      if (imagePath.includes(ref) || ref.includes(imagePath) || 
          imagePath.replace(/\\/g, '/').includes(ref.replace(/\\/g, '/')) ||
          ref.includes(path.basename(imagePath))) {
        isUsed = true;
      }
    });
    
    // Special cases - always keep these
    if (imagePath.includes('favicon') || 
        imagePath.includes('apple-touch-icon') ||
        imagePath === '/logo.svg' ||
        imagePath.includes('PyfactorLandingpage')) {
      isUsed = true;
    }
    
    if (isUsed) {
      usedImages.push(imagePath);
    } else {
      unusedImages.push(imagePath);
    }
  });
  
  // Get file sizes
  console.log('=== UNUSED IMAGES ===');
  let totalUnusedSize = 0;
  unusedImages.forEach(imagePath => {
    const fullPath = path.join(publicDir, imagePath);
    const stats = fs.statSync(fullPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    totalUnusedSize += stats.size;
    console.log(`${imagePath} - ${sizeMB} MB`);
  });
  
  console.log(`\nTotal unused images: ${unusedImages.length}`);
  console.log(`Total size of unused images: ${(totalUnusedSize / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n=== USED IMAGES ===');
  console.log(usedImages.join('\n'));
  console.log(`\nTotal used images: ${usedImages.length}`);
  
  // Save results to file
  const results = {
    unusedImages,
    usedImages,
    totalUnused: unusedImages.length,
    totalUsed: usedImages.length,
    totalUnusedSizeMB: (totalUnusedSize / 1024 / 1024).toFixed(2)
  };
  
  fs.writeFileSync('unused-images-report.json', JSON.stringify(results, null, 2));
  console.log('\nReport saved to unused-images-report.json');
}

findUnusedImages();