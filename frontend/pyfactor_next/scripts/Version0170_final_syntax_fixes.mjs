#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Files to fix based on the latest errors
const filesToFix = [
  'src/services/inventoryService.js',
  'src/utils/languageUtils.js',
  'src/utils/menuPrivileges.js',
  'src/utils/onboardingUtils.js',
  'src/utils/pageAccess.js'
];

// Backup original files
async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup_${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  console.log(`✅ Backed up ${path.basename(filePath)} to ${path.basename(backupPath)}`);
}

// Fix inventoryService.js 'use client' directive position
async function fixInventoryService() {
  const filePath = path.join(projectRoot, 'src/services/inventoryService.js');
  console.log('\n📝 Fixing src/services/inventoryService.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Move 'use client' to the top and remove duplicate imports
    const lines = content.split('\n');
    const newLines = [];
    let useClientMoved = false;
    const seenImports = new Set();
    
    // Add 'use client' at the very top
    newLines.push("'use client';");
    newLines.push('');
    useClientMoved = true;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip 'use client' directive if we encounter it
      if (trimmedLine === "'use client';" || trimmedLine === '"use client";') {
        continue;
      }
      
      // Handle import statements
      if (trimmedLine.startsWith('import')) {
        // Remove duplicate appCache imports
        if (trimmedLine.includes('appCache')) {
          const normalizedImport = trimmedLine.replace(/\s+/g, ' ');
          if (!seenImports.has(normalizedImport)) {
            seenImports.add(normalizedImport);
            // Keep the named import format
            if (trimmedLine.includes('{ appCache }')) {
              newLines.push(line);
            }
            // Skip default import format if we already have named import
            else if (!Array.from(seenImports).some(imp => imp.includes('{ appCache }'))) {
              newLines.push(line);
            }
          }
        } else {
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    }
    
    content = newLines.join('\n');
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed "use client" directive position and duplicate imports in inventoryService.js');
  } catch (error) {
    console.error('❌ Error fixing inventoryService.js:', error.message);
  }
}

// Fix languageUtils.js 'use client' directive position
async function fixLanguageUtils() {
  const filePath = path.join(projectRoot, 'src/utils/languageUtils.js');
  console.log('\n📝 Fixing src/utils/languageUtils.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Move 'use client' to the top and remove duplicate imports
    const lines = content.split('\n');
    const newLines = [];
    const seenImports = new Set();
    
    // Add 'use client' at the very top
    newLines.push("'use client';");
    newLines.push('');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip 'use client' directive if we encounter it
      if (trimmedLine === "'use client';" || trimmedLine === '"use client";') {
        continue;
      }
      
      // Handle import statements
      if (trimmedLine.startsWith('import')) {
        // Remove duplicate appCache imports
        if (trimmedLine.includes('appCache')) {
          const normalizedImport = trimmedLine.replace(/\s+/g, ' ');
          if (!seenImports.has(normalizedImport)) {
            seenImports.add(normalizedImport);
            // Keep the named import format
            if (trimmedLine.includes('{ appCache }')) {
              newLines.push(line);
            }
          }
        } else {
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    }
    
    content = newLines.join('\n');
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed "use client" directive position and duplicate imports in languageUtils.js');
  } catch (error) {
    console.error('❌ Error fixing languageUtils.js:', error.message);
  }
}

// Fix menuPrivileges.js expression error
async function fixMenuPrivileges() {
  const filePath = path.join(projectRoot, 'src/utils/menuPrivileges.js');
  console.log('\n📝 Fixing src/utils/menuPrivileges.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix the malformed expression
    content = content.replace(
      /const userAttributes = getCacheValue\('auth'\)\?\.userAttributes \|\|\s*\(typeof window !== 'undefined' && appCache\.getAll\(\)\) \? const userRole = userAttributes/g,
      "const userAttributes = getCacheValue('auth')?.userAttributes || (typeof window !== 'undefined' && appCache.getAll()) || {};\n        const userRole = userAttributes"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed expression error in menuPrivileges.js');
  } catch (error) {
    console.error('❌ Error fixing menuPrivileges.js:', error.message);
  }
}

// Fix onboardingUtils.js duplicate imports
async function fixOnboardingUtils() {
  const filePath = path.join(projectRoot, 'src/utils/onboardingUtils.js');
  console.log('\n📝 Fixing src/utils/onboardingUtils.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Remove duplicate imports
    const lines = content.split('\n');
    const newLines = [];
    const seenImports = new Set();
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('import')) {
        // Normalize import statement for comparison
        const normalizedImport = trimmedLine.replace(/\s+/g, ' ');
        
        if (!seenImports.has(normalizedImport)) {
          seenImports.add(normalizedImport);
          newLines.push(line);
        }
        // Skip duplicate imports
      } else {
        newLines.push(line);
      }
    }
    
    content = newLines.join('\n');
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed duplicate imports in onboardingUtils.js');
  } catch (error) {
    console.error('❌ Error fixing onboardingUtils.js:', error.message);
  }
}

// Fix pageAccess.js syntax error
async function fixPageAccess() {
  const filePath = path.join(projectRoot, 'src/utils/pageAccess.js');
  console.log('\n📝 Fixing src/utils/pageAccess.js...');
  
  try {
    await backupFile(filePath);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Fix the syntax error: missing closing parenthesis and operator
    content = content.replace(
      /const tenantId = getCacheValue\('auth'\)\?\.tenantId \|\|\s*\(typeof window !== 'undefined' && appCache\.getAll\(\)\s*getCacheValue\('tenantId'\);/g,
      "const tenantId = getCacheValue('auth')?.tenantId || (typeof window !== 'undefined' && appCache.getAll()) ? getCacheValue('tenantId') : null;"
    );
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Fixed syntax error in pageAccess.js');
  } catch (error) {
    console.error('❌ Error fixing pageAccess.js:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting final syntax fixes...\n');
  
  try {
    await fixInventoryService();
    await fixLanguageUtils();
    await fixMenuPrivileges();
    await fixOnboardingUtils();
    await fixPageAccess();
    
    console.log('\n✅ All final syntax fixes completed!');
    console.log('\n📋 Summary:');
    console.log('- Fixed "use client" directive position in inventoryService.js');
    console.log('- Fixed "use client" directive position in languageUtils.js');
    console.log('- Fixed expression error in menuPrivileges.js');
    console.log('- Fixed duplicate imports in onboardingUtils.js');
    console.log('- Fixed syntax error in pageAccess.js');
    console.log('\n🚀 Next step: Run "pnpm run build" to test the fixes');
  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

main();