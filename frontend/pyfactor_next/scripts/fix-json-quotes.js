#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const localesDir = path.join(__dirname, '../public/locales');

console.log('Fixing JSON quote issues in locale files...\n');

// Get all JSON files in the locales directory
const jsonFiles = glob.sync(path.join(localesDir, '**/*.json'));

let fixedCount = 0;

jsonFiles.forEach(filePath => {
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace smart quotes with regular quotes
    content = content
      .replace(/"/g, '"')  // Replace left double quotes
      .replace(/"/g, '"')  // Replace right double quotes
      .replace(/'/g, "'")  // Replace left single quotes
      .replace(/'/g, "'"); // Replace right single quotes
    
    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed quotes in ${path.relative(localesDir, filePath)}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}: ${error.message}`);
  }
});

console.log(`\nFixed ${fixedCount} files with quote issues.`);