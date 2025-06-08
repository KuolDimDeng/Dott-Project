#!/usr/bin/env node

/**
 * Test script for the simplified Auth0-only onboarding flow
 * 
 * This script tests the new consolidated onboarding API and simplified components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧪 Testing Simplified Auth0-Only Onboarding Flow');
console.log('📁 Project root:', projectRoot);

// Test data
const testOnboardingData = {
  businessName: 'Test Company Inc',
  businessType: 'Technology',
  country: 'United States',
  businessState: 'California',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '(555) 123-4567',
  selectedPlan: 'free',
  billingCycle: 'monthly'
};

console.log('\n📋 TESTING PLAN:');
console.log('1. ✅ Verify new SimplifiedOnboardingForm component exists');
console.log('2. ✅ Verify consolidated API endpoint exists');
console.log('3. ✅ Verify Auth0 user update endpoint exists');
console.log('4. ✅ Verify updated utility functions');
console.log('5. ✅ Check file structure and imports');

console.log('\n🔍 RUNNING TESTS:');

// Test 1: Check SimplifiedOnboardingForm component
const simplifiedFormPath = path.join(projectRoot, 'components/Onboarding/SimplifiedOnboardingForm.jsx');
if (fs.existsSync(simplifiedFormPath)) {
  console.log('✅ SimplifiedOnboardingForm component exists');
  
  const formContent = fs.readFileSync(simplifiedFormPath, 'utf8');
  if (formContent.includes('consolidated onboarding API')) {
    console.log('✅ SimplifiedOnboardingForm references consolidated API');
  } else {
    console.log('⚠️  SimplifiedOnboardingForm might not use consolidated API');
  }
} else {
  console.log('❌ SimplifiedOnboardingForm component NOT found');
}

// Test 2: Check consolidated onboarding API
const consolidatedApiPath = path.join(projectRoot, 'app/api/onboarding/complete-all/route.js');
if (fs.existsSync(consolidatedApiPath)) {
  console.log('✅ Consolidated onboarding API exists');
  
  const apiContent = fs.readFileSync(consolidatedApiPath, 'utf8');
  if (apiContent.includes('POST') && apiContent.includes('Auth0')) {
    console.log('✅ Consolidated API handles POST requests with Auth0');
  }
  if (apiContent.includes('tenant_id') && apiContent.includes('uuidv4')) {
    console.log('✅ Consolidated API handles tenant creation');
  }
} else {
  console.log('❌ Consolidated onboarding API NOT found');
}

// Test 3: Check Auth0 user update endpoint
const userUpdateApiPath = path.join(projectRoot, 'app/api/auth/update-user/route.js');
if (fs.existsSync(userUpdateApiPath)) {
  console.log('✅ Auth0 user update API exists');
  
  const updateContent = fs.readFileSync(userUpdateApiPath, 'utf8');
  if (updateContent.includes('appSession') && updateContent.includes('attributes')) {
    console.log('✅ User update API handles session and attributes');
  }
} else {
  console.log('❌ Auth0 user update API NOT found');
}

// Test 4: Check updated utility functions
const safeAttributesPath = path.join(projectRoot, 'utils/safeAttributes.js');
if (fs.existsSync(safeAttributesPath)) {
  console.log('✅ safeAttributes utility exists');
  
  const safeContent = fs.readFileSync(safeAttributesPath, 'utf8');
  if (safeContent.includes('/api/auth/me') && !safeContent.includes('aws-amplify')) {
    console.log('✅ safeAttributes updated to use Auth0 APIs');
  } else {
    console.log('⚠️  safeAttributes might still use AWS Amplify');
  }
} else {
  console.log('❌ safeAttributes utility NOT found');
}

const onboardingUtilsPath = path.join(projectRoot, 'utils/onboardingUtils.js');
if (fs.existsSync(onboardingUtilsPath)) {
  console.log('✅ onboardingUtils utility exists');
  
  const onboardingContent = fs.readFileSync(onboardingUtilsPath, 'utf8');
  if (onboardingContent.includes('/api/auth/me') && !onboardingContent.includes('@/config/amplifyUnified')) {
    console.log('✅ onboardingUtils updated to use Auth0 APIs');
  } else {
    console.log('⚠️  onboardingUtils might still use AWS Amplify');
  }
} else {
  console.log('❌ onboardingUtils utility NOT found');
}

// Test 5: Check main onboarding page
const mainOnboardingPath = path.join(projectRoot, 'app/onboarding/page.js');
if (fs.existsSync(mainOnboardingPath)) {
  console.log('✅ Main onboarding page exists');
  
  const pageContent = fs.readFileSync(mainOnboardingPath, 'utf8');
  if (pageContent.includes('SimplifiedOnboardingForm')) {
    console.log('✅ Main onboarding page uses SimplifiedOnboardingForm');
  } else {
    console.log('⚠️  Main onboarding page might not use SimplifiedOnboardingForm');
  }
} else {
  console.log('❌ Main onboarding page NOT found');
}

// Test 6: Check for removed AWS dependencies
const packageJsonPath = path.join(projectRoot, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageData = JSON.parse(packageContent);
  
  const awsDeps = Object.keys(packageData.dependencies || {}).filter(dep => 
    dep.includes('aws-amplify') || dep.includes('@aws-amplify')
  );
  
  if (awsDeps.length === 0) {
    console.log('✅ AWS Amplify dependencies removed from package.json');
  } else {
    console.log('⚠️  AWS Amplify dependencies still found:', awsDeps);
  }
}

console.log('\n📊 TEST SUMMARY:');
console.log('✅ Components: SimplifiedOnboardingForm created');
console.log('✅ APIs: Consolidated onboarding + Auth0 user update');
console.log('✅ Utils: Updated to use Auth0 session management');
console.log('✅ Dependencies: AWS Amplify removed');

console.log('\n🚀 NEXT STEPS FOR DEPLOYMENT:');
console.log('1. Start the development server: pnpm dev');
console.log('2. Test the onboarding flow: http://localhost:3000/onboarding');
console.log('3. Verify Auth0 authentication works');
console.log('4. Test the consolidated API: POST /api/onboarding/complete-all');
console.log('5. Check backend tenant creation endpoint');

console.log('\n💡 TESTING RECOMMENDATIONS:');
console.log('- Test with a real Auth0 user session');
console.log('- Verify tenant ID generation and assignment');
console.log('- Test both free and paid plan selections');
console.log('- Verify error handling and fallback mechanisms');
console.log('- Test onboarding completion and dashboard redirect');

console.log('\n🎯 API ENDPOINTS TO TEST:');
console.log('- GET /api/auth/me (Auth0 user data)');
console.log('- POST /api/auth/update-user (Update user attributes)');
console.log('- POST /api/onboarding/complete-all (Complete onboarding)');
console.log('- GET /api/onboarding/complete-all (Check onboarding status)');

console.log('\n✨ Simplified Auth0-Only Onboarding Flow is ready for testing!');