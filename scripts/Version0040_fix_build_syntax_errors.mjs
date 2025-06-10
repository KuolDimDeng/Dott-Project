#!/usr/bin/env node

/**
 * Version 0.040 - Fix Build Syntax Errors
 * 
 * This script fixes syntax errors that are preventing the build:
 * 1. Fixes unterminated string in auth route (logout URL)
 * 2. Fixes unclosed React fragment in home page
 * 
 * @fixes build-syntax-errors
 * @affects frontend/pyfactor_next/src/app/api/auth/[...auth0]/route.js
 * @affects frontend/pyfactor_next/src/app/page.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend', 'pyfactor_next');

async function fixAuthRoute() {
  console.log('🔧 Fixing auth route syntax error...');
  
  const authRoutePath = path.join(frontendDir, 'src', 'app', 'api', 'auth', '[...auth0]', 'route.js');
  
  // Read the file
  let content = await fs.readFile(authRoutePath, 'utf-8');
  
  // Fix the unterminated string - the backtick should be a regular quote
  content = content.replace(
    /const logoutUrl = 'https:\/\/auth\.dottapps\.com\/v2\/logout\?` \+/,
    "const logoutUrl = 'https://auth.dottapps.com/v2/logout?' +"
  );
  
  await fs.writeFile(authRoutePath, content);
  console.log('✅ Fixed auth route syntax error');
}

async function fixHomePage() {
  console.log('📄 Fixing home page syntax error...');
  
  const homePagePath = path.join(frontendDir, 'src', 'app', 'page.js');
  
  // Read the file
  let content = await fs.readFile(homePagePath, 'utf-8');
  
  // Check if there's an unclosed fragment
  const fragmentOpenCount = (content.match(/<>/g) || []).length;
  const fragmentCloseCount = (content.match(/<\/>/g) || []).length;
  
  if (fragmentOpenCount > fragmentCloseCount) {
    // Find the last closing tag before the final }
    const lastBraceIndex = content.lastIndexOf('}');
    const beforeBrace = content.substring(0, lastBraceIndex);
    const afterBrace = content.substring(lastBraceIndex);
    
    // Insert the closing fragment tag
    const insertPosition = beforeBrace.lastIndexOf(')');
    content = beforeBrace.substring(0, insertPosition) + 
              '\n    </>' + 
              beforeBrace.substring(insertPosition) + 
              afterBrace;
    
    await fs.writeFile(homePagePath, content);
    console.log('✅ Fixed home page syntax error - added missing </> fragment close');
  } else {
    console.log('ℹ️  Home page fragments appear balanced, checking for other issues...');
    
    // The error might be related to the CrispInitializer addition
    // Let's ensure proper formatting
    if (content.includes('<CrispInitializer />') && !content.includes('</>\n  );')) {
      // Fix the return statement formatting
      content = content.replace(/return \(\s*<>\s*<CrispInitializer \/>/g, 
        'return (\n    <>\n      <CrispInitializer />');
      
      // Ensure proper closing
      content = content.replace(/(<\/\w+>\s*)(\);)/g, '$1\n    </>\n  $2');
      
      await fs.writeFile(homePagePath, content);
      console.log('✅ Fixed home page formatting');
    }
  }
}

async function validateFixes() {
  console.log('\n🔍 Validating fixes...');
  
  // Check auth route
  const authRoutePath = path.join(frontendDir, 'src', 'app', 'api', 'auth', '[...auth0]', 'route.js');
  const authContent = await fs.readFile(authRoutePath, 'utf-8');
  
  if (authContent.includes("'https://auth.dottapps.com/v2/logout?`")) {
    console.error('❌ Auth route still has syntax error!');
    return false;
  }
  
  // Check home page
  const homePagePath = path.join(frontendDir, 'src', 'app', 'page.js');
  const homeContent = await fs.readFile(homePagePath, 'utf-8');
  
  const openFragments = (homeContent.match(/<>/g) || []).length;
  const closeFragments = (homeContent.match(/<\/>/g) || []).length;
  
  if (openFragments !== closeFragments) {
    console.error('❌ Home page still has unbalanced fragments!');
    return false;
  }
  
  console.log('✅ All syntax errors fixed!');
  return true;
}

async function main() {
  console.log('🚀 Starting Build Syntax Error Fixes - Version 0.040');
  console.log('=' .repeat(50));
  
  try {
    // Fix auth route
    await fixAuthRoute();
    
    // Fix home page
    await fixHomePage();
    
    // Validate fixes
    const isValid = await validateFixes();
    
    if (isValid) {
      console.log('\n✅ All syntax errors have been fixed!');
      console.log('=' .repeat(50));
      console.log('\n🎯 Next steps:');
      console.log('1. Commit these fixes');
      console.log('2. Push to trigger a new build');
      console.log('3. Monitor the build logs');
    } else {
      console.error('\n❌ Some errors remain. Please check manually.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error during fixes:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);