#!/bin/bash

echo "Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "Resetting module state..."
rm -rf node_modules/.vite

# Create a temporary script to fix module resolution
cat > fix-modules.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Find package.json files with potential ESM/CJS mixing issues
function findPackageJsonFiles(dir) {
  const packageFiles = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.next') {
      packageFiles.push(...findPackageJsonFiles(filePath));
    } else if (file === 'package.json') {
      packageFiles.push(filePath);
    }
  });
  
  return packageFiles;
}

// Check node_modules for problematic packages
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  const problematicPackages = [
    '@aws-amplify',
    'aws-amplify',
    'react-toastify',
    'react-transition-group'
  ];
  
  problematicPackages.forEach(pkg => {
    const pkgPath = path.join(nodeModulesPath, pkg);
    if (fs.existsSync(pkgPath)) {
      console.log(`Found potentially problematic package: ${pkg}`);
    }
  });
}

console.log("Module check completed");
EOF

# Run the fix modules script
node fix-modules.js

echo "Rebuilding application..."
npm run build

echo "Cache cleared and application rebuilt."
echo "You can now start the application with:"
echo "npm run dev" 