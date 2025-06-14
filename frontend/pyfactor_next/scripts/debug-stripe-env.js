#!/usr/bin/env node

console.log('\n🔍🔍🔍 STRIPE ENVIRONMENT DEBUG 🔍🔍🔍');
console.log('=====================================');
console.log('Build Time:', new Date().toISOString());
console.log('Current Directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

// Check for Stripe variables
console.log('🔑 Stripe Environment Variables:');
console.log('-------------------------------------');

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (stripeKey) {
  console.log('✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is SET');
  console.log(`   Preview: ${stripeKey.substring(0, 20)}...`);
  console.log(`   Length: ${stripeKey.length} characters`);
  console.log(`   Starts with: ${stripeKey.substring(0, 7)}`);
} else {
  console.log('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is NOT SET');
}

// Check all environment variables that might be related
console.log('\n📋 All Environment Variables containing "STRIPE":');
console.log('-------------------------------------');
let stripeVarsFound = 0;
Object.keys(process.env).forEach(key => {
  if (key.includes('STRIPE')) {
    stripeVarsFound++;
    const value = process.env[key];
    console.log(`${key}: ${value ? 'SET' : 'NOT SET'}`);
  }
});
if (stripeVarsFound === 0) {
  console.log('❌ No environment variables containing "STRIPE" found');
}

// Check all NEXT_PUBLIC_ variables
console.log('\n📋 All NEXT_PUBLIC_ Environment Variables:');
console.log('-------------------------------------');
const nextPublicVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'));
if (nextPublicVars.length > 0) {
  nextPublicVars.forEach(key => {
    const value = process.env[key];
    console.log(`${key}: ${value ? 'SET' : 'NOT SET'}`);
  });
} else {
  console.log('❌ No NEXT_PUBLIC_ variables found');
}

// Check if running in Render
console.log('\n🏗️  Render Environment Check:');
console.log('-------------------------------------');
console.log('RENDER:', process.env.RENDER || 'NOT SET');
console.log('RENDER_SERVICE_NAME:', process.env.RENDER_SERVICE_NAME || 'NOT SET');
console.log('RENDER_SERVICE_TYPE:', process.env.RENDER_SERVICE_TYPE || 'NOT SET');
console.log('RENDER_GIT_BRANCH:', process.env.RENDER_GIT_BRANCH || 'NOT SET');

console.log('\n=====================================');
console.log('🔍🔍🔍 END STRIPE DEBUG 🔍🔍🔍\n');