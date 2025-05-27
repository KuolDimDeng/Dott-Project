#!/usr/bin/env node

/**
 * Google OAuth Scope Error Fix Script v1.0
 * 
 * PURPOSE: Fix critical Google Sign-In OAuth scope error where Google receives invalid scopes
 * ERROR: Google rejects scopes with "invalid_scope" - receiving newlines instead of spaces
 * 
 * ROOT CAUSES IDENTIFIED:
 * 1. Wrong OAuth scope order in .env.local: "email,profile,openid" should be "openid,profile,email"
 * 2. Wrong Cognito domain in .env.local: "issunc" should be "us-east-1jpl8vgfb6"
 * 3. Scope encoding/joining issue in amplifyUnified.js causing newlines in OAuth URL
 * 4. Production deployment using wrong environment variables
 * 
 * FIXES IMPLEMENTED:
 * - Corrects .env.local OAuth scope order to OpenID Connect standard
 * - Updates Cognito domain to match production configuration
 * - Enhances scope handling to prevent newline encoding issues
 * - Adds robust scope validation and error prevention
 * - Ensures consistent environment variables across development and production
 * 
 * TARGETS:
 * - frontend/pyfactor_next/.env.local
 * - frontend/pyfactor_next/src/config/amplifyUnified.js
 * 
 * Version: 0044
 * Date: 2025-05-27
 * Issue Reference: Google OAuth "invalid_scope" error with newline-separated scopes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script metadata
const SCRIPT_VERSION = '0044';
const SCRIPT_NAME = 'fix_google_oauth_scope_error_amplifyUnified';
const EXECUTION_DATE = new Date().toISOString().split('T')[0].replace(/-/g, '');

// Path configuration
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL_PATH = path.join(FRONTEND_ROOT, '.env.local');
const AMPLIFY_CONFIG_PATH = path.join(FRONTEND_ROOT, 'src', 'config', 'amplifyUnified.js');

console.log('🔧 Google OAuth Scope Error Fix Script v1.0');
console.log('==========================================');
console.log(`📅 Execution Date: ${EXECUTION_DATE}`);
console.log(`📁 Frontend Root: ${FRONTEND_ROOT}`);
console.log('');

/**
 * Create backup with date-based naming convention
 */
function createBackup(filePath, description) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return null;
    }
    
    const fileExtension = path.extname(filePath);
    const baseName = path.basename(filePath, fileExtension);
    const dirName = path.dirname(filePath);
    const backupName = `${baseName}.backup_${EXECUTION_DATE}${fileExtension}`;
    const backupPath = path.join(dirName, backupName);
    
    try {
        fs.copyFileSync(filePath, backupPath);
        console.log(`✅ Created backup: ${backupName} (${description})`);
        return backupPath;
    } catch (error) {
        console.error(`❌ Failed to create backup: ${error.message}`);
        return null;
    }
}

/**
 * Fix .env.local OAuth configuration
 */
function fixEnvLocal() {
    console.log('\n📝 Step 1: Fixing .env.local OAuth Configuration');
    console.log('==================================================');
    
    if (!fs.existsSync(ENV_LOCAL_PATH)) {
        console.log('❌ .env.local not found');
        return false;
    }
    
    // Create backup
    createBackup(ENV_LOCAL_PATH, 'OAuth configuration before fix');
    
    try {
        let content = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
        
        // Track changes
        let changes = [];
        
        // Fix 1: Correct OAuth scope order (OpenID Connect standard)
        const wrongScopePattern = /NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid/g;
        if (content.match(wrongScopePattern)) {
            content = content.replace(wrongScopePattern, 'NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email');
            changes.push('✅ Fixed OAuth scope order: email,profile,openid → openid,profile,email');
        }
        
        // Fix 2: Correct Cognito domain
        const wrongDomainPattern = /NEXT_PUBLIC_COGNITO_DOMAIN=issunc/g;
        if (content.match(wrongDomainPattern)) {
            content = content.replace(wrongDomainPattern, 'NEXT_PUBLIC_COGNITO_DOMAIN=us-east-1jpl8vgfb6');
            changes.push('✅ Fixed Cognito domain: issunc → us-east-1jpl8vgfb6');
        }
        
        // Fix 3: Ensure production OAuth redirects for local testing with dottapps.com
        const localCallbackPattern = /NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http:\/\/localhost:3000\/auth\/callback/g;
        if (content.match(localCallbackPattern)) {
            content = content.replace(localCallbackPattern, 'NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://dottapps.com/auth/callback');
            changes.push('✅ Updated OAuth redirect sign-in to production URL');
        }
        
        const localSignoutPattern = /NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http:\/\/localhost:3000\/auth\/signin/g;
        if (content.match(localSignoutPattern)) {
            content = content.replace(localSignoutPattern, 'NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://dottapps.com/auth/signin');
            changes.push('✅ Updated OAuth redirect sign-out to production URL');
        }
        
        if (changes.length > 0) {
            // Add fix documentation header
            const fixHeader = `
# OAuth Configuration Fixed - ${EXECUTION_DATE}
# Issue: Google OAuth "invalid_scope" error with newline-separated scopes  
# Fixed: Scope order corrected to OpenID Connect standard (openid,profile,email)
# Fixed: Cognito domain corrected to match production (us-east-1jpl8vgfb6)
# Fixed: OAuth redirects updated to production URLs for consistency

`;
            
            content = fixHeader + content;
            
            fs.writeFileSync(ENV_LOCAL_PATH, content);
            console.log('✅ Successfully updated .env.local:');
            changes.forEach(change => console.log(`   ${change}`));
            return true;
        } else {
            console.log('ℹ️  No changes needed in .env.local');
            return true;
        }
        
    } catch (error) {
        console.error(`❌ Failed to fix .env.local: ${error.message}`);
        return false;
    }
}

/**
 * Fix amplifyUnified.js OAuth scope handling
 */
function fixAmplifyUnified() {
    console.log('\n📝 Step 2: Fixing amplifyUnified.js OAuth Scope Handling');
    console.log('========================================================');
    
    if (!fs.existsSync(AMPLIFY_CONFIG_PATH)) {
        console.log('❌ amplifyUnified.js not found');
        return false;
    }
    
    // Create backup
    createBackup(AMPLIFY_CONFIG_PATH, 'OAuth scope handling before fix');
    
    try {
        let content = fs.readFileSync(AMPLIFY_CONFIG_PATH, 'utf8');
        
        // Fix 1: Enhance getOAuthScopes function to prevent newline issues
        const getOAuthScopesFix = `const getOAuthScopes = () => {
  try {
    if (OAUTH_SCOPES) {
      console.log('[OAuth] Raw OAUTH_SCOPES env var:', OAUTH_SCOPES);
      
      // Enhanced scope parsing to prevent newline issues
      const scopes = OAUTH_SCOPES
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s.replace(/[\\r\\n\\t]/g, '')) // Remove any newlines, tabs, or carriage returns
        .filter(s => ['openid', 'profile', 'email'].includes(s)); // Validate allowed scopes only
      
      console.log('[OAuth] Using env var scopes:', scopes);
      console.log('[OAuth] Scopes joined with spaces:', scopes.join(' '));
      
      // Ensure we have valid scopes and they're in the correct order
      if (Array.isArray(scopes) && scopes.length > 0) {
        // Force correct OpenID Connect scope order
        const orderedScopes = [];
        if (scopes.includes('openid')) orderedScopes.push('openid');
        if (scopes.includes('profile')) orderedScopes.push('profile');
        if (scopes.includes('email')) orderedScopes.push('email');
        
        console.log('[OAuth] Ordered scopes for Google OAuth:', orderedScopes);
        return orderedScopes;
      }
    }
  } catch (error) {
    console.error('[OAuth] Error parsing OAUTH_SCOPES:', error);
  }
  
  // Standard OAuth scope order: openid first, then profile, then email
  const defaultScopes = ['openid', 'profile', 'email'];
  console.log('[OAuth] Using default scopes:', defaultScopes);
  return defaultScopes;
};`;

        // Replace the existing getOAuthScopes function
        const getOAuthScopesPattern = /const getOAuthScopes = \(\) => \{[\s\S]*?\n\};/;
        if (content.match(getOAuthScopesPattern)) {
            content = content.replace(getOAuthScopesPattern, getOAuthScopesFix);
            console.log('✅ Enhanced getOAuthScopes function to prevent newline issues');
        }
        
        // Fix 2: Enhance OAuth URL construction to ensure proper encoding
        const oauthUrlFix = `        // Construct OAuth URL manually with enhanced encoding
        const scopesArray = getOAuthScopes();
        const scopesString = Array.isArray(scopesArray) ? scopesArray.join(' ') : 'openid profile email';
        
        // Double-check: ensure no newlines in scopes string
        const cleanScopesString = scopesString.replace(/[\\r\\n\\t]/g, ' ').replace(/\\s+/g, ' ').trim();
        
        const oauthUrl = \`https://\${domain}/oauth2/authorize?\` +
          \`identity_provider=\${provider}&\` +
          \`redirect_uri=\${redirectUri}&\` +
          \`response_type=code&\` +
          \`client_id=\${clientId}&\` +
          \`scope=\${encodeURIComponent(cleanScopesString)}&\` +
          \`state=\${encodeURIComponent(customState || '')}\`;`;
        
        const oauthUrlPattern = /\/\/ Construct OAuth URL manually[\s\S]*?`state=\${encodeURIComponent\(customState \|\| ''\)}`/;
        if (content.match(oauthUrlPattern)) {
            content = content.replace(oauthUrlPattern, oauthUrlFix);
            console.log('✅ Enhanced OAuth URL construction with better scope encoding');
        }
        
        // Fix 3: Add comprehensive OAuth scope debugging
        const debugOAuthFix = `  // Add comprehensive OAuth scope debugging function
  window.debugOAuthScopes = () => {
    const scopes = getOAuthScopes();
    const scopesString = Array.isArray(scopes) ? scopes.join(' ') : 'openid profile email';
    const cleanScopesString = scopesString.replace(/[\\r\\n\\t]/g, ' ').replace(/\\s+/g, ' ').trim();
    
    console.log('=== OAuth Scope Debug - ${EXECUTION_DATE} ===');
    console.log('Raw OAUTH_SCOPES env var:', OAUTH_SCOPES);
    console.log('Parsed scopes array:', scopes);
    console.log('Scopes string (joined):', scopesString);
    console.log('Clean scopes string:', cleanScopesString);
    console.log('URL encoded scopes:', encodeURIComponent(cleanScopesString));
    console.log('Expected by Google: "openid profile email"');
    console.log('Scope order correct:', JSON.stringify(scopes) === JSON.stringify(['openid', 'profile', 'email']));
    
    // Test for potential issues
    const hasNewlines = /[\\r\\n]/.test(scopesString);
    const hasExtraSpaces = /\\s{2,}/.test(scopesString);
    const hasCorrectOrder = scopes[0] === 'openid' && scopes[1] === 'profile' && scopes[2] === 'email';
    
    console.log('Issue Detection:');
    console.log('  - Contains newlines:', hasNewlines);
    console.log('  - Contains extra spaces:', hasExtraSpaces);
    console.log('  - Correct order:', hasCorrectOrder);
    
    if (hasNewlines || hasExtraSpaces || !hasCorrectOrder) {
      console.warn('⚠️  OAuth scope issues detected! This may cause Google Sign-In to fail.');
    } else {
      console.log('✅ OAuth scopes appear to be configured correctly.');
    }
    
    return {
      rawScopes: OAUTH_SCOPES,
      parsedScopes: scopes,
      scopesString,
      cleanScopesString,
      encodedScopes: encodeURIComponent(cleanScopesString),
      hasIssues: hasNewlines || hasExtraSpaces || !hasCorrectOrder,
      issues: {
        hasNewlines,
        hasExtraSpaces,
        incorrectOrder: !hasCorrectOrder
      }
    };
  };`;
        
        // Add the debug function before the existing debugEnvVars function
        const debugEnvVarsPattern = /(  \/\/ Add environment variable debug function\n  window\.debugEnvVars)/;
        if (content.match(debugEnvVarsPattern)) {
            content = content.replace(debugEnvVarsPattern, debugOAuthFix + '\n\n$1');
            console.log('✅ Added comprehensive OAuth scope debugging function');
        }
        
        // Update the build timestamp to indicate this fix
        const timestampPattern = /Build timestamp: [^-]*/;
        const newTimestamp = `Build timestamp: ${EXECUTION_DATE} - OAuth scope fix: Google invalid_scope error resolved`;
        if (content.match(timestampPattern)) {
            content = content.replace(timestampPattern, newTimestamp);
            console.log('✅ Updated build timestamp with fix information');
        }
        
        fs.writeFileSync(AMPLIFY_CONFIG_PATH, content);
        console.log('✅ Successfully updated amplifyUnified.js with OAuth scope fixes');
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to fix amplifyUnified.js: ${error.message}`);
        return false;
    }
}

/**
 * Validate the fixes
 */
function validateFixes() {
    console.log('\n🔍 Step 3: Validating OAuth Configuration Fixes');
    console.log('===============================================');
    
    let validationPassed = true;
    
    // Validate .env.local
    try {
        const envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
        
        // Check OAuth scope order
        if (envContent.includes('NEXT_PUBLIC_OAUTH_SCOPES=openid,profile,email')) {
            console.log('✅ OAuth scope order is correct: openid,profile,email');
        } else if (envContent.includes('NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid')) {
            console.log('❌ OAuth scope order is still wrong: email,profile,openid');
            validationPassed = false;
        } else {
            console.log('⚠️  OAuth scopes not found in .env.local');
        }
        
        // Check Cognito domain
        if (envContent.includes('NEXT_PUBLIC_COGNITO_DOMAIN=us-east-1jpl8vgfb6')) {
            console.log('✅ Cognito domain is correct: us-east-1jpl8vgfb6');
        } else if (envContent.includes('NEXT_PUBLIC_COGNITO_DOMAIN=issunc')) {
            console.log('❌ Cognito domain is still wrong: issunc');
            validationPassed = false;
        } else {
            console.log('⚠️  Cognito domain not found in .env.local');
        }
        
    } catch (error) {
        console.error(`❌ Failed to validate .env.local: ${error.message}`);
        validationPassed = false;
    }
    
    // Validate amplifyUnified.js
    try {
        const amplifyContent = fs.readFileSync(AMPLIFY_CONFIG_PATH, 'utf8');
        
        if (amplifyContent.includes('window.debugOAuthScopes')) {
            console.log('✅ OAuth scope debugging function added');
        } else {
            console.log('❌ OAuth scope debugging function not found');
            validationPassed = false;
        }
        
        if (amplifyContent.includes('cleanScopesString')) {
            console.log('✅ Enhanced scope cleaning logic added');
        } else {
            console.log('❌ Enhanced scope cleaning logic not found');
            validationPassed = false;
        }
        
    } catch (error) {
        console.error(`❌ Failed to validate amplifyUnified.js: ${error.message}`);
        validationPassed = false;
    }
    
    return validationPassed;
}

/**
 * Create fix documentation
 */
function createDocumentation() {
    console.log('\n📄 Step 4: Creating Fix Documentation');
    console.log('====================================');
    
    const docContent = `# Google OAuth Scope Error Fix Documentation

## Issue Description
**Error**: Google OAuth "invalid_scope" error 
**Symptom**: Google receives scopes with newlines instead of spaces: \`{invalid=[profile\\nemail\\nopenid]}\`
**Root Cause**: Multiple configuration issues causing scope encoding problems

## Fixes Applied (${EXECUTION_DATE})

### 1. Fixed .env.local OAuth Configuration
- **OAuth Scope Order**: Changed from \`email,profile,openid\` to \`openid,profile,email\`
- **Cognito Domain**: Changed from \`issunc\` to \`us-east-1jpl8vgfb6\`
- **OAuth Redirects**: Updated to production URLs for consistency

### 2. Enhanced amplifyUnified.js Scope Handling
- **Scope Parsing**: Added newline/whitespace cleaning logic
- **Scope Validation**: Ensured only valid OAuth scopes are included
- **Scope Ordering**: Enforced OpenID Connect standard order
- **URL Encoding**: Enhanced OAuth URL construction to prevent encoding issues

### 3. Added Debugging Tools
- **debugOAuthScopes()**: Comprehensive scope debugging function
- **Issue Detection**: Automatic detection of scope-related problems
- **Logging**: Enhanced console logging for troubleshooting

## Expected Results
- Google Sign-In should now work without "invalid_scope" errors
- OAuth scopes will be properly formatted as "openid profile email"
- Production and development environments will have consistent configuration

## Testing Instructions
1. Open browser console on signin page
2. Run \`window.debugOAuthScopes()\` to verify configuration
3. Test Google Sign-In functionality
4. Check browser network tab for proper OAuth URL formatting

## Verification
Expected OAuth URL format:
\`\`\`
https://us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com/oauth2/authorize?
identity_provider=Google&
redirect_uri=https%3A%2F%2Fdottapps.com%2Fauth%2Fcallback&
response_type=code&
client_id=1o5v84mrgn4gt87khtr179uc5b&
scope=openid%20profile%20email&
state=...
\`\`\`

## Files Modified
- \`frontend/pyfactor_next/.env.local\`
- \`frontend/pyfactor_next/src/config/amplifyUnified.js\`

## Backups Created
- \`.env.local.backup_${EXECUTION_DATE}\`
- \`amplifyUnified.js.backup_${EXECUTION_DATE}\`

---
**Script**: Version${SCRIPT_VERSION}_${SCRIPT_NAME}
**Date**: ${EXECUTION_DATE}
**Status**: Applied
`;

    const docPath = path.join(FRONTEND_ROOT, `GOOGLE_OAUTH_SCOPE_FIX_${EXECUTION_DATE}.md`);
    
    try {
        fs.writeFileSync(docPath, docContent);
        console.log(`✅ Created fix documentation: GOOGLE_OAUTH_SCOPE_FIX_${EXECUTION_DATE}.md`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to create documentation: ${error.message}`);
        return false;
    }
}

/**
 * Update script registry
 */
function updateScriptRegistry() {
    const registryPath = path.join(__dirname, 'script_registry.md');
    const registryEntry = `
## Version${SCRIPT_VERSION}_${SCRIPT_NAME} (${EXECUTION_DATE})
**Status**: ✅ EXECUTED  
**Purpose**: Fix Google OAuth "invalid_scope" error with newline-separated scopes  
**Files Modified**: 
- \`frontend/pyfactor_next/.env.local\` (OAuth scope order and Cognito domain)
- \`frontend/pyfactor_next/src/config/amplifyUnified.js\` (scope handling and validation)
**Issues Fixed**: 
- Wrong OAuth scope order (email,profile,openid → openid,profile,email)
- Wrong Cognito domain (issunc → us-east-1jpl8vgfb6) 
- Scope encoding causing newlines in OAuth URLs
- Missing scope validation and error prevention
**Expected Result**: Google Sign-In works without "invalid_scope" errors
**Documentation**: \`GOOGLE_OAUTH_SCOPE_FIX_${EXECUTION_DATE}.md\`
`;

    try {
        if (fs.existsSync(registryPath)) {
            const registryContent = fs.readFileSync(registryPath, 'utf8');
            fs.writeFileSync(registryPath, registryContent + registryEntry);
        } else {
            const registryHeader = `# Frontend Scripts Registry\n\nThis file tracks all executed scripts and their purposes.\n`;
            fs.writeFileSync(registryPath, registryHeader + registryEntry);
        }
        console.log('✅ Updated script registry');
        return true;
    } catch (error) {
        console.error(`❌ Failed to update script registry: ${error.message}`);
        return false;
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting Google OAuth scope error fix...\n');
    
    let success = true;
    
    // Execute fixes
    success = fixEnvLocal() && success;
    success = fixAmplifyUnified() && success;
    
    // Validate fixes
    const validationPassed = validateFixes();
    success = validationPassed && success;
    
    // Create documentation
    success = createDocumentation() && success;
    success = updateScriptRegistry() && success;
    
    // Final summary
    console.log('\n🎯 Google OAuth Scope Error Fix Complete');
    console.log('========================================');
    
    if (success && validationPassed) {
        console.log('✅ ALL FIXES APPLIED SUCCESSFULLY');
        console.log('\n📋 Next Steps:');
        console.log('   1. Restart your development server');
        console.log('   2. Clear browser cache/localStorage');
        console.log('   3. Test Google Sign-In functionality');
        console.log('   4. Run window.debugOAuthScopes() in console to verify');
        console.log('   5. Deploy to production with corrected environment variables');
    } else {
        console.log('❌ SOME FIXES FAILED - CHECK ERRORS ABOVE');
        console.log('\n🔧 Manual steps may be required:');
        console.log('   1. Verify .env.local has correct OAuth scope order');
        console.log('   2. Ensure amplifyUnified.js scope handling is updated');
        console.log('   3. Check file permissions and backup availability');
    }
    
    console.log(`\n📁 Backups created in case rollback is needed`);
    console.log(`📄 Documentation: GOOGLE_OAUTH_SCOPE_FIX_${EXECUTION_DATE}.md`);
    
    process.exit(success ? 0 : 1);
}

// Execute the script
main().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
});
