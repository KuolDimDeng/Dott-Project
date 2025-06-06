#!/usr/bin/env node

/**
 * Script: Version0049_generate_auth0_secret.mjs
 * Purpose: Generate a secure AUTH0_SECRET for session encryption
 * Created: 2025-01-06
 * 
 * This script generates a cryptographically secure random string
 * suitable for use as AUTH0_SECRET in the Vercel environment.
 */

import crypto from 'crypto';

// Function to generate secure random string
function generateAuth0Secret(length = 64) {
    return crypto.randomBytes(length).toString('base64url');
}

// Generate multiple options
console.log('\n🔐 AUTH0_SECRET Generator\n');
console.log('Choose one of these secure AUTH0_SECRET values:\n');

// Generate 3 different options
for (let i = 1; i <= 3; i++) {
    const secret = generateAuth0Secret();
    console.log(`Option ${i} (${secret.length} chars):`);
    console.log(`${secret}\n`);
}

console.log('📋 Instructions:');
console.log('1. Copy one of the above secrets');
console.log('2. Go to Vercel Dashboard → Project Settings → Environment Variables');
console.log('3. Update the AUTH0_SECRET variable with the new value');
console.log('4. Redeploy your application for changes to take effect\n');

console.log('⚠️  Important Notes:');
console.log('- AUTH0_SECRET should be different from AUTH0_CLIENT_SECRET');
console.log('- Keep this value secure and never commit it to version control');
console.log('- This is only needed in Vercel (frontend), not in Render (backend)\n');
