#!/usr/bin/env node

/**
 * Debug script to show Auth0 environment variables for frontend
 */

console.log("\n🔍 Frontend Debug - Auth0 Environment Variables:");
console.log("=" * 60);

const envVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL', 
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'AUTH0_AUDIENCE',
    'AUTH0_SCOPE',
    'NODE_ENV',
    'VERCEL_ENV',
    'NEXT_PUBLIC_API_URL',
    'BACKEND_API_URL'
];

envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        // Hide sensitive values
        if (varName.includes('SECRET') || varName.includes('AUDIENCE')) {
            console.log(`   ${varName}: ${value.substring(0, 8)}...`);
        } else {
            console.log(`   ${varName}: ${value}`);
        }
    } else {
        console.log(`   ${varName}: NOT_SET`);
    }
});

console.log("=" * 60);
console.log("✅ Frontend environment variable debug complete\n"); 