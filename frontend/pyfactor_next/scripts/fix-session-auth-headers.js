#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');

// Find all JS/JSX/TS/TSX files
function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      findFiles(fullPath, files);
    } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Update SessionID to Session
function updateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip backup files
  if (filePath.includes('.backup')) {
    return false;
  }
  
  // Replace SessionID with Session in authorization headers
  const patterns = [
    /(['"`])Authorization(['"`]):\s*(['"`])SessionID\s+/g,
    /Authorization['"`]:\s*`SessionID\s+/g,
    /['"`]Authorization['"`]:\s*`SessionID\s+/g
  ];
  
  let updatedContent = content;
  let hasChanges = false;
  
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      updatedContent = updatedContent.replace(pattern, (match) => {
        hasChanges = true;
        return match.replace('SessionID', 'Session');
      });
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Updated: ${path.relative(srcDir, filePath)}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔍 Searching for files with SessionID auth headers...\n');

const files = findFiles(srcDir);
let updatedCount = 0;

for (const file of files) {
  if (updateFile(file)) {
    updatedCount++;
  }
}

console.log(`\n✨ Updated ${updatedCount} files`);
console.log('🎉 All SessionID references have been changed to Session');