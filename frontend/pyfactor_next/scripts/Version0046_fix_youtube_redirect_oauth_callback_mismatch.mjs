/**
 * Version 0046: Fix YouTube Redirect Issue - OAuth Callback URI Mismatch
 * 
 * ISSUE IDENTIFIED:
 * - Users getting redirected to YouTube during Google OAuth and not returning
 * - Root cause: OAuth redirect URI configured as `/auth/callback` but users accessing `/auth/callback-direct`
 * - Google's CheckCookie process (including YouTube) is normal, but redirect fails due to URI mismatch
 * 
 * SOLUTION:
 * - Update OAuth redirect URI to match the actual callback endpoint `/auth/callback-direct`
 * - Ensure Cognito OAuth configuration matches the frontend routing
 * - Create backup of environment file before changes
 * 
 * Author: Cline
 * Date: 2025-05-29
 * Version: 0046
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const envLocalPath = path.join(__dirname, '..', '.env.local');
const backupPath = path.join(__dirname, '..', '.env.local.backup_20250529_071000');

console.log('🔧 Version 0046: Fixing YouTube Redirect Issue - OAuth Callback URI Mismatch');
console.log('');

try {
  // Create backup of current .env.local
  if (fs.existsSync(envLocalPath)) {
    console.log('📁 Creating backup of .env.local...');
    fs.copyFileSync(envLocalPath, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);
  }

  // Read current .env.local content
  let envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  console.log('🔍 Current OAuth redirect configuration:');
  const currentRedirectSignIn = envContent.match(/NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=(.+)/)?.[1];
  const currentRedirectSignOut = envContent.match(/NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=(.+)/)?.[1];
  console.log(`   Sign In:  ${currentRedirectSignIn}`);
  console.log(`   Sign Out: ${currentRedirectSignOut}`);
  console.log('');

  // Update OAuth redirect URIs to match actual callback endpoints
  console.log('🔄 Updating OAuth redirect URIs to fix callback mismatch...');
  
  // Fix the redirect URI mismatch
  envContent = envContent.replace(
    /NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https:\/\/dottapps\.com\/auth\/callback/,
    'NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://dottapps.com/auth/callback-direct'
  );

  // Also need to ensure the sign out still works properly
  envContent = envContent.replace(
    /NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https:\/\/dottapps\.com\/auth\/signin/,
    'NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://dottapps.com/auth/signin'
  );

  // Add explanatory comment
  const timestamp = new Date().toISOString();
  const updateComment = `
# OAuth Redirect URI Fix - ${timestamp}
# Issue: Users redirected to YouTube during Google OAuth and not returning to app
# Root Cause: OAuth redirect URI mismatch (/auth/callback vs /auth/callback-direct)
# Solution: Updated redirect URI to match actual callback endpoint
# YouTube redirect is Google's normal CheckCookie process - issue was URI mismatch
`;

  // Insert comment at the top of OAuth section
  envContent = envContent.replace(
    /# OAuth Configuration for Google Sign-In \(Local Development\)/,
    `# OAuth Configuration for Google Sign-In (Local Development)${updateComment}`
  );

  // Write updated content
  fs.writeFileSync(envLocalPath, envContent);

  console.log('✅ OAuth redirect URIs updated:');
  console.log('   Sign In:  https://dottapps.com/auth/callback-direct');
  console.log('   Sign Out: https://dottapps.com/auth/signin');
  console.log('');

  // Verify the changes
  const updatedContent = fs.readFileSync(envLocalPath, 'utf8');
  const newRedirectSignIn = updatedContent.match(/NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=(.+)/)?.[1];
  const newRedirectSignOut = updatedContent.match(/NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=(.+)/)?.[1];

  console.log('🔍 Verification - Updated OAuth configuration:');
  console.log(`   Sign In:  ${newRedirectSignIn}`);
  console.log(`   Sign Out: ${newRedirectSignOut}`);
  console.log('');

  // Instructions for AWS Cognito console update
  console.log('⚠️  IMPORTANT: AWS Cognito Console Update Required');
  console.log('');
  console.log('You must update the OAuth redirect URI in AWS Cognito console:');
  console.log('');
  console.log('1. Go to AWS Cognito Console');
  console.log('2. Navigate to User Pools > us-east-1_JPL8vGfb6');
  console.log('3. Go to App integration > App clients > 1o5v84mrgn4gt87khtr179uc5b');
  console.log('4. Edit OAuth 2.0 settings');
  console.log('5. Update "Allowed callback URLs" from:');
  console.log('   https://dottapps.com/auth/callback');
  console.log('   TO:');
  console.log('   https://dottapps.com/auth/callback-direct');
  console.log('6. Save changes');
  console.log('');
  console.log('💡 This change will fix the YouTube redirect issue by ensuring');
  console.log('   Google OAuth can properly redirect back to your app.');

  console.log('');
  console.log('✅ Version 0046 completed successfully!');
  console.log('📝 Next steps:');
  console.log('   1. Update AWS Cognito redirect URI (instructions above)');
  console.log('   2. Deploy frontend changes to Vercel');
  console.log('   3. Test Google OAuth flow');

} catch (error) {
  console.error('❌ Error in Version 0046:', error.message);
  console.error(error.stack);
  process.exit(1);
}
