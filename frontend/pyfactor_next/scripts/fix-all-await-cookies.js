#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Finding all files with await cookies() pattern...\n');

// Find all files with the await cookies() pattern
const apiDir = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api';
const command = `grep -r "await cookies()" "${apiDir}" -l | head -200`;

let filesToFix = [];
try {
  const result = execSync(command, { encoding: 'utf8' });
  filesToFix = result.trim().split('\n').filter(file => file);
  console.log(`Found ${filesToFix.length} files to fix\n`);
} catch (error) {
  console.error('Error finding files:', error.message);
  process.exit(1);
}

let successCount = 0;
let errorCount = 0;

filesToFix.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all variations of await cookies()
    let fixedContent = content;
    
    // Pattern 1: const cookieStore = await cookies();
    fixedContent = fixedContent.replace(/const\s+cookieStore\s*=\s*await\s+cookies\(\)/g, 'const cookieStore = cookies()');
    
    // Pattern 2: const cookies = await cookies();
    fixedContent = fixedContent.replace(/const\s+cookies\s*=\s*await\s+cookies\(\)/g, 'const cookies = cookies()');
    
    // Pattern 3: Any variable name = await cookies();
    fixedContent = fixedContent.replace(/const\s+(\w+)\s*=\s*await\s+cookies\(\)/g, 'const $1 = cookies()');
    
    // Pattern 4: Direct usage like (await cookies()).get()
    fixedContent = fixedContent.replace(/\(await\s+cookies\(\)\)/g, 'cookies()');
    
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ Fixed: ${path.relative(apiDir, filePath)}`);
      successCount++;
    } else {
      console.log(`⏭️  No changes needed: ${path.relative(apiDir, filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${path.relative(apiDir, filePath)}: ${error.message}`);
    errorCount++;
  }
});

console.log('\n========================================');
console.log(`Total files processed: ${filesToFix.length}`);
console.log(`Successfully fixed: ${successCount}`);
console.log(`Errors: ${errorCount}`);
console.log('========================================\n');

console.log('⚠️  IMPORTANT: This is a critical fix for production cookie issues.');
console.log('According to CLAUDE.md [31.0.0], cookies() should NOT be awaited in Next.js.');
console.log('Please test the application thoroughly after this change.');