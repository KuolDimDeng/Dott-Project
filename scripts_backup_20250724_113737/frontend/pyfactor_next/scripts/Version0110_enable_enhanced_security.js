#!/usr/bin/env node

/**
 * Version0110_enable_enhanced_security.js
 * 
 * Enable enhanced security features in the frontend
 * - Device fingerprinting
 * - Session heartbeat monitoring
 * - Security-aware authentication
 * 
 * Author: Claude
 * Date: 2025-01-18
 */

const fs = require('fs').promises;
const path = require('path');

// Script metadata
const SCRIPT_VERSION = 'Version0110';
const SCRIPT_DESCRIPTION = 'Enable enhanced security features';

async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup_${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  console.log(`✓ Backed up: ${path.basename(filePath)}`);
  return backupPath;
}

async function updateEstablishSession() {
  console.log('\n=== Updating Establish Session Route ===');
  
  const routePath = path.join(process.cwd(), 'src/app/api/auth/establish-session/route.js');
  const enhancedPath = path.join(process.cwd(), 'src/app/api/auth/establish-session/route.enhanced.js');
  
  try {
    // Check if enhanced version exists
    await fs.access(enhancedPath);
    
    // Backup original
    await backupFile(routePath);
    
    // Replace with enhanced version
    const enhancedContent = await fs.readFile(enhancedPath, 'utf8');
    await fs.writeFile(routePath, enhancedContent);
    
    console.log('✓ Updated establish-session route with security features');
    return true;
  } catch (error) {
    console.error('✗ Failed to update establish-session route:', error.message);
    return false;
  }
}

async function updateLayout() {
  console.log('\n=== Updating Root Layout ===');
  
  const layoutPath = path.join(process.cwd(), 'src/app/layout.js');
  const enhancedLayoutPath = path.join(process.cwd(), 'src/app/layout.enhanced.js');
  
  try {
    // Check if enhanced version exists
    await fs.access(enhancedLayoutPath);
    
    // Backup original
    await backupFile(layoutPath);
    
    // Replace with enhanced version
    const enhancedContent = await fs.readFile(enhancedLayoutPath, 'utf8');
    await fs.writeFile(layoutPath, enhancedContent);
    
    console.log('✓ Updated layout with SessionHeartbeat component');
    return true;
  } catch (error) {
    console.error('✗ Failed to update layout:', error.message);
    return false;
  }
}

async function updateAuthCallback() {
  console.log('\n=== Updating Auth Callback ===');
  
  const callbackPath = path.join(process.cwd(), 'src/app/auth/callback/page.js');
  
  try {
    let content = await fs.readFile(callbackPath, 'utf8');
    
    // Check if already using secure auth
    if (content.includes('useSecureAuth')) {
      console.log('✓ Auth callback already using enhanced security');
      return true;
    }
    
    // Backup original
    await backupFile(callbackPath);
    
    // Update imports
    content = content.replace(
      "import { useSession } from '@/hooks/useSession';",
      `import { useSession } from '@/hooks/useSession';
import { useSecureAuth } from '@/hooks/useSecureAuth';`
    );
    
    // Replace establishSession with secure version
    content = content.replace(
      /const\s+{\s*session,\s*setSession,\s*clearSession\s*}\s*=\s*useSession\(\);/,
      `const { session, setSession, clearSession } = useSession();
  const { handleSecureCallback } = useSecureAuth();`
    );
    
    // Update the callback handling
    content = content.replace(
      /const response = await fetch\('\/api\/auth\/callback'/,
      `// Use secure callback handler
      const sessionData = await handleSecureCallback(code, state);
      
      // The secure handler already sets up the session
      setIsSuccess(true);
      return;
      
      // Original callback code (replaced by secure handler)
      /*
      const response = await fetch('/api/auth/callback'`
    );
    
    // Close the comment block
    content = content.replace(
      /router\.push\(redirectPath\);/,
      `router.push(redirectPath);
      */`
    );
    
    await fs.writeFile(callbackPath, content);
    console.log('✓ Updated auth callback with secure authentication');
    return true;
  } catch (error) {
    console.error('✗ Failed to update auth callback:', error.message);
    return false;
  }
}

async function updateSignInForm() {
  console.log('\n=== Updating Sign-In Form ===');
  
  const signInPath = path.join(process.cwd(), 'src/components/auth/EmailPasswordSignIn.jsx');
  
  try {
    let content = await fs.readFile(signInPath, 'utf8');
    
    // Check if already using secure auth
    if (content.includes('useSecureAuth')) {
      console.log('✓ Sign-in form already using enhanced security');
      return true;
    }
    
    // Backup original
    await backupFile(signInPath);
    
    // Add import
    content = content.replace(
      /import\s+{\s*useRouter\s*}\s*from\s+['"]next\/navigation['"];/,
      `import { useRouter } from 'next/navigation';
import { useSecureAuth } from '@/hooks/useSecureAuth';`
    );
    
    // Add hook
    content = content.replace(
      /const\s+router\s*=\s*useRouter\(\);/,
      `const router = useRouter();
  const { secureSignIn } = useSecureAuth();`
    );
    
    // Update sign-in logic
    content = content.replace(
      /const response = await fetch\('\/api\/auth\/login'/,
      `// Use secure sign-in
      try {
        await secureSignIn(email, password);
        // secureSignIn handles navigation
        return;
      } catch (error) {
        setError(error.message);
        return;
      }
      
      // Original sign-in code (replaced by secure handler)
      /*
      const response = await fetch('/api/auth/login'`
    );
    
    // Find and close the comment block at the end of the onSubmit function
    const submitEndIndex = content.indexOf('} finally {');
    if (submitEndIndex !== -1) {
      const afterFinally = content.indexOf('}', submitEndIndex + 10);
      if (afterFinally !== -1) {
        content = content.substring(0, afterFinally + 1) + '\n      */' + content.substring(afterFinally + 1);
      }
    }
    
    await fs.writeFile(signInPath, content);
    console.log('✓ Updated sign-in form with secure authentication');
    return true;
  } catch (error) {
    console.error('✗ Failed to update sign-in form:', error.message);
    return false;
  }
}

async function updateScriptRegistry() {
  console.log('\n=== Updating Script Registry ===');
  
  const registryPath = path.join(process.cwd(), 'scripts/script_registry.md');
  
  try {
    const entry = `
### ${SCRIPT_VERSION}_enable_enhanced_security.js
- **Purpose**: Enable enhanced security features (device fingerprinting, session heartbeat, risk assessment)
- **Changes**: 
  - Updated establish-session route with device fingerprinting
  - Added SessionHeartbeat component to root layout
  - Updated auth callback to use secure authentication
  - Updated sign-in form with enhanced security
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Author**: Claude
`;
    
    await fs.appendFile(registryPath, entry);
    console.log('✓ Updated script registry');
    return true;
  } catch (error) {
    console.error('✗ Failed to update script registry:', error.message);
    return false;
  }
}

async function main() {
  console.log('=' * 60);
  console.log('Enhanced Security Implementation');
  console.log(`Version: ${SCRIPT_VERSION}`);
  console.log('=' * 60);
  console.log();
  
  console.log('This script will enable enhanced security features:');
  console.log('- Device fingerprinting for all sessions');
  console.log('- Automatic session heartbeat monitoring');
  console.log('- Risk-based authentication');
  console.log('- Security status tracking');
  console.log();
  
  const updates = [
    updateEstablishSession,
    updateLayout,
    updateAuthCallback,
    updateSignInForm,
    updateScriptRegistry
  ];
  
  let success = true;
  for (const update of updates) {
    if (!await update()) {
      success = false;
      break;
    }
  }
  
  console.log('\n' + '=' * 60);
  if (success) {
    console.log('✓ Enhanced security features enabled successfully!');
    console.log('=' * 60);
    console.log('\nNext steps:');
    console.log('1. Test device fingerprinting in development');
    console.log('2. Verify session heartbeat is working');
    console.log('3. Check security headers in network tab');
    console.log('4. Deploy to production');
    console.log('\nSecurity features:');
    console.log('- Device fingerprinting collects browser characteristics');
    console.log('- Session heartbeat runs every 60 seconds');
    console.log('- Risk scores are calculated for each session');
    console.log('- High-risk sessions may require additional verification');
  } else {
    console.log('✗ Failed to enable all security features');
    console.log('Check the errors above and try again');
  }
}

// Run the script
main().catch(console.error);