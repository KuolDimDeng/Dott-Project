#!/usr/bin/env node
/**
 * Fix image loading issues by replacing Next.js Image components with UnoptimizedImage
 * 
 * This script provides instructions on how to fix image loading issues by using
 * the UnoptimizedImage component instead of the regular Next.js Image component.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '🔍 Image Loading Fix Tool');
console.log('\x1b[33m%s\x1b[0m', '-'.repeat(50));
console.log('This tool helps fix image loading issues in Next.js by replacing optimized Image components with unoptimized ones.');

// Check if UnoptimizedImage component exists
const unoptimizedImagePath = path.join(__dirname, '../src/components/UnoptimizedImage.js');
if (!fs.existsSync(unoptimizedImagePath)) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: UnoptimizedImage component not found!');
  console.log('Please create the UnoptimizedImage component first at:');
  console.log(`  ${unoptimizedImagePath}`);
  process.exit(1);
}

// Find all files that import next/image
try {
  console.log('\n\x1b[36m%s\x1b[0m', '1. Finding files that import Image from next/image:');
  const grepResult = execSync('grep -r "import.*Image.*from.*next/image" --include="*.js*" src/').toString();
  
  const files = grepResult.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const match = line.match(/(.*?):/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
  
  const uniqueFiles = [...new Set(files)];
  
  console.log(`   Found ${uniqueFiles.length} files with Image imports.`);
  
  // Instructions for manual fixing
  console.log('\n\x1b[36m%s\x1b[0m', '2. How to fix each file:');
  console.log('\x1b[33m%s\x1b[0m', '   Step 1: Replace the import statement:');
  console.log('     FROM: import Image from "next/image";');
  console.log('     TO:   import UnoptimizedImage from "../components/UnoptimizedImage";');
  console.log('     (Adjust the import path as needed)');
  
  console.log('\n\x1b[33m%s\x1b[0m', '   Step 2: Replace Image tags with UnoptimizedImage:');
  console.log('     FROM: <Image src="/path/to/image.png" ... />');
  console.log('     TO:   <UnoptimizedImage src="/path/to/image.png" ... />');
  
  console.log('\n\x1b[36m%s\x1b[0m', '3. Files that need to be fixed:');
  uniqueFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  
  console.log('\n\x1b[32m%s\x1b[0m', '✅ You can also add the unoptimized prop directly to existing Image components:');
  console.log('   <Image src="/path/to/image.png" unoptimized={true} ... />');
  
  console.log('\n\x1b[35m%s\x1b[0m', '💡 Tip: Only fix files where images are failing to load.');
  
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error searching for files:');
  console.error(error.message);
  process.exit(1);
}

// Final instructions
console.log('\n\x1b[36m%s\x1b[0m', 'To restart the server after making changes:');
console.log('1. Stop the current server (Ctrl+C)');
console.log('2. Run: ./start-https.sh');
console.log('\x1b[33m%s\x1b[0m', '-'.repeat(50)); 