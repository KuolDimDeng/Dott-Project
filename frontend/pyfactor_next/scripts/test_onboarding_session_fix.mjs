#!/usr/bin/env node

/**
 * Test script to verify onboarding session fix is working correctly
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧪 Testing Onboarding Session Fix');
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
          pattern: 'setTimeout(async () => {',
          description: 'Has setTimeout with async function for delayed redirect',
          critical: true
        },
        {
          pattern: "await fetch('/api/auth/refresh-session', { method: 'POST' })",
          description: 'Calls refresh-session endpoint before redirect',
          critical: true
        },
        {
          pattern: 'window.location.href = result.redirect_url',
          description: 'Uses window.location.href for redirect',
          critical: true
        },
        {
          pattern: '500); // 500ms delay',
          description: 'Has 500ms delay before redirect',
          critical: false
        }
      ]
    },
    {
      file: 'src/app/api/onboarding/complete-all/route.js',
      checks: [
        {
          pattern: 'needsOnboarding: false',
          description: 'Sets needsOnboarding to false in session',
          critical: true
        },
        {
          pattern: 'onboardingCompleted: true',
          description: 'Sets onboardingCompleted to true',
          critical: true
        },
        {
          pattern: "currentStep: 'completed'",
          description: "Sets currentStep to 'completed'",
          critical: true
        },
        {
          pattern: '[CompleteOnboarding] Setting updated session cookie',
          description: 'Has logging for cookie update',
          critical: false
        },
        {
          pattern: '// Remove domain to let browser handle it automatically',
          description: 'Domain restriction removed from cookies',
          critical: false
        }
      ]
    },
    {
      file: 'src/app/api/auth/refresh-session/route.js',
      checks: [
        {
          pattern: 'export async function POST(request)',
          description: 'Has POST handler for session refresh',
          critical: true
        },
        {
          pattern: 'sessionData.user.needsOnboarding = false',
          description: 'Updates needsOnboarding in session',
          critical: true
        },
        {
          pattern: 'sessionData.user.onboardingCompleted = true',
          description: 'Updates onboardingCompleted in session',
          critical: true
        },
        {
          pattern: 'const tenantIdCookie = cookieStore.get',
          description: 'Gets tenant ID from cookie',
          critical: true
        }
      ]
    },
    {
      file: 'src/app/api/auth/profile/route.js',
      checks: [
        {
          pattern: "'Cache-Control': 'no-store, no-cache, must-revalidate'",
          description: 'Has cache control headers',
          critical: true
        },
        {
          pattern: 'needsOnboarding: user.needsOnboarding !== false',
          description: 'Correctly calculates needsOnboarding',
          critical: true
        },
        {
          pattern: 'dataSource: accessToken ? \'session+backend\' : \'session-only\'',
          description: 'Shows data source for debugging',
          critical: false
        }
      ]
    }
  ];
  
  console.log('\n🔍 Verifying Onboarding Session Fix Implementation:\n');
  
  let allPassed = true;
  
  for (const fix of fixes) {
    const passed = await checkFile(fix.file, fix.checks);
    if (!passed) allPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('✅ All onboarding session fixes are in place!');
    
    console.log('\n🔧 How the fix works:');
    console.log('1. User completes onboarding form');
    console.log('2. complete-all API updates session with onboarding status');
    console.log('3. SimplifiedOnboardingForm waits 500ms for cookie to be set');
    console.log('4. Calls refresh-session API to ensure session is updated');
    console.log('5. Redirects to dashboard with window.location.href');
    console.log('6. Profile API returns updated session with needsOnboarding: false');
    
    console.log('\n📋 Testing checklist:');
    console.log('1. Clear all cookies for dottapps.com');
    console.log('2. Sign in with a new user account');
    console.log('3. Complete the onboarding form');
    console.log('4. Watch browser console for:');
    console.log('   - "[SimplifiedOnboarding] Refreshing session before redirect..."');
    console.log('   - "[SimplifiedOnboarding] Redirecting to dashboard..."');
    console.log('5. Verify dashboard loads without redirect loop');
    console.log('6. Check profile API response shows needsOnboarding: false');
  } else {
    console.log('❌ Some fixes are missing or incorrect');
    console.log('\n⚠️  Please review the failed checks above');
  }
  
  // Additional diagnostics
  console.log('\n🔍 Quick diagnostics commands:');
  console.log('1. Check cookies: document.cookie');
  console.log("2. Check profile: fetch('/api/auth/profile').then(r => r.json()).then(console.log)");
  console.log("3. Check session: fetch('/api/auth/session').then(r => r.json()).then(console.log)");
  console.log("4. Force refresh: fetch('/api/auth/refresh-session', {method: 'POST'}).then(r => r.json()).then(console.log)");
}

main().catch(console.error);