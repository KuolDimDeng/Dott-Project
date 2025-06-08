#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Function to get all JavaScript files in src directory
async function getAllJSFiles(dir) {
  const files = [];
  
  async function scanDir(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  await scanDir(dir);
  return files;
}

// Backup original file
async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup_${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

// Fix a single file
async function fixFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let hasChanges = false;
    const relativePath = path.relative(projectRoot, filePath);
    
    // 1. Fix invalid assignments to function calls
    const invalidAssignmentPatterns = [
      // appCache.getAll() = something
      /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*\{\};/g,
      /appCache\.getAll\(\)\s*=\s*\{\};/g,
      /appCache\.getAll\(\)\s*=\s*([^;]+);/g,
      
      // appCache.get('key') = something
      /appCache\.get\(['"`]([^'"`]+)['"`]\)\s*=\s*([^;]+);/g,
      
      // appCache.getAll().prop = something
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*appCache\.getAll\(\)\.\1\s*\|\|\s*\{\};/g,
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);/g,
    ];
    
    const originalContent = content;
    
    // Fix appCache.getAll() = appCache.getAll() || {};
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*appCache\.getAll\(\)\s*\|\|\s*\{\};/g,
      'if (!appCache.getAll()) appCache.init();'
    );
    
    // Fix appCache.getAll() = {};
    content = content.replace(
      /appCache\.getAll\(\)\s*=\s*\{\};/g,
      'appCache.init();'
    );
    
    // Fix appCache.get('key') = value;
    content = content.replace(
      /appCache\.get\(['"`]([^'"`]+)['"`]\)\s*=\s*([^;]+);/g,
      "appCache.set('$1', $2);"
    );
    
    // Fix appCache.getAll().prop = appCache.getAll().prop || {};
    content = content.replace(
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*appCache\.getAll\(\)\.\1\s*\|\|\s*\{\};/g,
      "if (!appCache.get('$1')) appCache.set('$1', {});"
    );
    
    // Fix appCache.getAll().prop = value;
    content = content.replace(
      /appCache\.getAll\(\)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);/g,
      "appCache.set('$1', $2);"
    );
    
    if (content !== originalContent) {
      hasChanges = true;
      console.log(`  ✅ Fixed invalid assignments in ${relativePath}`);
    }
    
    // 2. Remove duplicate imports
    const lines = content.split('\n');
    const newLines = [];
    const seenImports = new Set();
    let useClientDirective = null;
    let useClientFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Capture 'use client' directive
      if (trimmedLine === "'use client';" || trimmedLine === '"use client";') {
        if (!useClientFound) {
          useClientDirective = line;
          useClientFound = true;
        }
        continue; // Skip this line, we'll add it at the top later
      }
      
      // Handle import statements
      if (trimmedLine.startsWith('import')) {
        const normalizedImport = trimmedLine.replace(/\s+/g, ' ');
        
        // Special handling for appCache imports
        if (trimmedLine.includes('appCache')) {
          const appCacheKey = 'appCache';
          if (!seenImports.has(appCacheKey)) {
            seenImports.add(appCacheKey);
            // Prefer named import format
            if (trimmedLine.includes('{ appCache }')) {
              newLines.push(line);
            } else if (!Array.from(seenImports).some(imp => imp.includes('{ appCache }'))) {
              // Convert default import to named import
              newLines.push(line.replace(/import\s+appCache\s+from/, "import { appCache } from"));
            }
          }
          // Skip duplicate appCache imports
        } else if (!seenImports.has(normalizedImport)) {
          seenImports.add(normalizedImport);
          newLines.push(line);
        }
        // Skip other duplicate imports
      } else {
        newLines.push(line);
      }
    }
    
    // Reconstruct content with 'use client' at the top if it was found
    if (useClientDirective) {
      content = [useClientDirective, '', ...newLines].join('\n');
    } else {
      content = newLines.join('\n');
    }
    
    if (content !== originalContent && !hasChanges) {
      hasChanges = true;
      console.log(`  ✅ Fixed imports and 'use client' positioning in ${relativePath}`);
    }
    
    // 3. Fix malformed expressions
    const malformedPatterns = [
      // Missing closing parenthesis patterns
      /\(typeof window !== 'undefined' &&\s*appCache\.getAll\(\)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      
      // Missing operator patterns
      /appCache\.getAll\(\)\s*\n\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      
      // Missing && operator
      /\(typeof window !== 'undefined' &&\s*appCache\.getAll\(\)\s*isValidUUID/g,
    ];
    
    const originalContentForMalformed = content;
    
    // Fix missing && operator in conditionals
    content = content.replace(
      /\(typeof window !== 'undefined' &&\s*appCache\.getAll\(\)\s*isValidUUID/g,
      "(typeof window !== 'undefined' && appCache.getAll() && isValidUUID"
    );
    
    // Fix missing closing parenthesis and operators
    content = content.replace(
      /const hasToken = !!\(appCache\.getAll\(\)\s*\n\s*if \(hasToken\)/g,
      "const hasToken = !!(appCache.getAll() && appCache.get('auth.token'));\n      \n      if (hasToken)"
    );
    
    // Fix expressions like: (typeof window !== 'undefined' && appCache.getAll() const userRole
    content = content.replace(
      /\(typeof window !== 'undefined' && appCache\.getAll\(\)\) \? const ([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      "(typeof window !== 'undefined' && appCache.getAll()) || {};\n        const $1"
    );
    
    if (content !== originalContentForMalformed) {
      hasChanges = true;
      console.log(`  ✅ Fixed malformed expressions in ${relativePath}`);
    }
    
    // Write back if changes were made
    if (hasChanges) {
      await fs.writeFile(filePath, content, 'utf8');
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
  console.log('🔧 Starting comprehensive syntax error fixes for all JavaScript files...\n');
  
  try {
    const srcDir = path.join(projectRoot, 'src');
    const allFiles = await getAllJSFiles(srcDir);
    
    console.log(`Found ${allFiles.length} JavaScript files to process\n`);
    
    let totalFixed = 0;
    let batchSize = 10;
    
    // Process files in batches to avoid overwhelming the system
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allFiles.length / batchSize)}...`);
      
      const promises = batch.map(async (filePath) => {
        const relativePath = path.relative(projectRoot, filePath);
        console.log(`  📝 Processing ${relativePath}...`);
        
        try {
          // Create backup first
          await backupFile(filePath);
          
          // Fix the file
          const wasFixed = await fixFile(filePath);
          if (wasFixed) {
            totalFixed++;
          }
          
          return { filePath, success: true, fixed: wasFixed };
        } catch (error) {
          console.error(`  ❌ Error processing ${relativePath}:`, error.message);
          return { filePath, success: false, error: error.message };
        }
      });
      
      await Promise.all(promises);
      console.log('');
    }
    
    console.log(`\n✅ Processing complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total files processed: ${allFiles.length}`);
    console.log(`   - Files with fixes applied: ${totalFixed}`);
    console.log(`   - Files unchanged: ${allFiles.length - totalFixed}`);
    console.log('\n🚀 Next step: Run "pnpm run build" to test the fixes');
    
  } catch (error) {
    console.error('\n❌ Error during comprehensive fixes:', error);
    process.exit(1);
  }
}

main();