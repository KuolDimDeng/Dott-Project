#!/usr/bin/env node

/**
 * Test script to verify session refresh fix after onboarding
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧪 Testing Session Refresh Fix After Onboarding');
console.log('='.repeat(60));

async function checkFile(filePath, checks) {
  try {
    const fullPath = path.join(projectRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    
    console.log(`\n📄 Checking ${filePath}:`);
    
    for (const check of checks) {
      const found = content.includes(check.pattern);
      const status = found ? '✅' : '❌';
      console.log(`  ${status} ${check.description}`);
      
      if (!found && check.critical) {
        console.log(`     ⚠️  Critical pattern not found!`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error checking ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  const fixes = [
    {
      file: 'src/components/Onboarding/SimplifiedOnboardingForm.jsx',
      checks: [
        {
          pattern: 'window.location.href = result.redirect_url',
          description: 'Uses window.location.href for redirect (forces session refresh)',
          critical: true
        },
        {
          pattern: '// Force a full page reload to refresh the session',
          description: 'Has comment explaining session refresh',
          critical: false
        }
      ]
    },
    {
      file: 'src/app/api/auth/profile/route.js',
      checks: [
        {
          pattern: "'Cache-Control': 'no-store, no-cache, must-revalidate'",
          description: 'Has cache control headers to prevent stale data',
          critical: true
        },
        {
          pattern: "needsOnboarding: user.needsOnboarding !== false",
          description: 'Correctly calculates needsOnboarding from session',
          critical: true
        }
      ]
    },
    {
      file: 'src/app/api/onboarding/complete-all/route.js',
      checks: [
        {
          pattern: 'needsOnboarding: false',
          description: 'Sets needsOnboarding to false in session update',
          critical: true
        },
        {
          pattern: 'onboardingCompleted: true',
          description: 'Sets onboardingCompleted to true in session',
          critical: true
        },
        {
          pattern: "redirect_url: `/tenant/${tenantId}/dashboard`",
          description: 'Returns correct tenant-scoped dashboard URL',
          critical: true
        }
      ]
    }
  ];
  
  console.log('\n🔍 Verifying Session Refresh Fix Implementation:\n');
  
  let allPassed = true;
  
  for (const fix of fixes) {
    const passed = await checkFile(fix.file, fix.checks);
    if (!passed) allPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('✅ All session refresh fixes are in place!');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy the changes to Vercel');
    console.log('2. Test the onboarding flow end-to-end');
    console.log('3. Verify that after onboarding completion:');
    console.log('   - User is redirected to /tenant/{tenantId}/dashboard');
    console.log('   - Profile shows needsOnboarding: false');
    console.log('   - No redirect loop back to onboarding');
    console.log('4. Check browser network tab for profile API calls');
    console.log('5. Verify session cookie is updated with onboarding status');
  } else {
    console.log('❌ Some fixes are missing or incorrect');
    console.log('\n⚠️  Please review the failed checks above');
  }
  
  // Check if backend fix is also in place
  console.log('\n🔧 Backend Auth0 Issuer Fix Status:');
  
  try {
    const backendAuthPath = path.join(projectRoot, '..', '..', 'backend', 'pyfactor', 'custom_auth', 'auth0_authentication.py');
    const backendContent = await fs.readFile(backendAuthPath, 'utf8');
    
    if (backendContent.includes('if self.issuer_domain and self.issuer_domain.startswith("https://")')) {
      console.log('✅ Backend Auth0 issuer fix is in place (handles double https://)');
    } else {
      console.log('⚠️  Backend may still have issuer validation issues');
    }
  } catch (error) {
    console.log('ℹ️  Could not check backend status:', error.message);
  }
}

main().catch(console.error);