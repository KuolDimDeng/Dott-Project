#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files with import path issues based on the error
const filesToFix = [
  'src/app/[tenantId]/dashboard/page.js',
  'src/app/auth/callback-direct/page.js',
  'src/app/auth/signout/page.js',
  'src/app/auth/verify-email/page.js',
  'src/app/onboarding/page.js'
];

// Helper function to calculate the correct relative path to utils
function calculateRelativePath(fromFile) {
  const fromDir = path.dirname(fromFile);
  const toFile = 'src/utils/appCache.js';
  
  // Count the number of directory levels
  const fromParts = fromDir.split('/').filter(part => part !== '.');
  const toParts = toFile.split('/');
  
  // Remove 'src' from both since we're calculating from within src
  const fromDirParts = fromParts.slice(1); // Remove 'src'
  const toDirParts = toParts.slice(1, -1); // Remove 'src' and filename
  
  // Calculate how many levels to go up
  const levelsUp = fromDirParts.length;
  
  // Build the relative path
  const upPath = '../'.repeat(levelsUp);
  const downPath = toDirParts.length > 0 ? toDirParts.join('/') + '/' : '';
  
  return upPath + downPath + 'appCache';
}

// Fix import paths in a file
async function fixImportPaths(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    
    // Calculate the correct relative path for this file
    const correctPath = calculateRelativePath(filePath);
    
    // Fix the import statement
    const oldPattern = /import\s*{\s*appCache\s*}\s*from\s*['"]\.\.\/utils\/appCache['"];?/g;
    const newImport = `import { appCache } from '${correctPath}';`;
    
    const originalContent = content;
    content = content.replace(oldPattern, newImport);
    
    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed import path in ${relativePath}: ${correctPath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 Fixing import paths for appCache...\n');
  
  try {
    let totalFixed = 0;
    
    for (const file of filesToFix) {
      const filePath = path.join(projectRoot, file);
      console.log(`📝 Processing ${file}...`);
      
      const wasFixed = await fixImportPaths(filePath);
      if (wasFixed) {
        totalFixed++;
      }
    }
    
    console.log(`\n✅ Import path fixes complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total files processed: ${filesToFix.length}`);
    console.log(`   - Files with fixes applied: ${totalFixed}`);
    console.log(`   - Files unchanged: ${filesToFix.length - totalFixed}`);
    console.log('\n🚀 Next step: Run "pnpm run build" to test the fixes');
    
  } catch (error) {
    console.error('\n❌ Error during import path fixes:', error);
    process.exit(1);
  }
}

main();