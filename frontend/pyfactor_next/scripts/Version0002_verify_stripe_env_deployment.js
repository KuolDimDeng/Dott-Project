#!/usr/bin/env node

/**
 * Script: Version0002_verify_stripe_env_deployment.js
 * Purpose: Verify Stripe environment variables are properly configured for deployment
 * Author: Claude
 * Date: 2025-01-13
 * 
 * This script checks and reports on Stripe environment variable configuration
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkEnvFiles() {
  console.log('🔍 Checking Stripe environment configuration...\n');
  
  const envFiles = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local'
  ];
  
  const rootDir = path.join(path.dirname(__dirname));
  
  for (const envFile of envFiles) {
    const envPath = path.join(rootDir, envFile);
    try {
      const content = await fs.readFile(envPath, 'utf8');
      const lines = content.split('\n');
      const stripeVars = lines.filter(line => line.includes('STRIPE'));
      
      if (stripeVars.length > 0) {
        console.log(`✅ Found in ${envFile}:`);
        stripeVars.forEach(line => {
          if (line.trim() && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
              const maskedValue = value.includes('sk_') ? 
                value.substring(0, 15) + '...' : 
                value.includes('pk_') ? 
                  value.substring(0, 20) + '...' : 
                  value;
              console.log(`   ${key.trim()} = ${maskedValue}`);
            }
          }
        });
        console.log('');
      }
    } catch (error) {
      // File doesn't exist, skip
    }
  }
  
  // Check package.json scripts
  console.log('📦 Checking build scripts...\n');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  
  const buildScripts = Object.entries(packageJson.scripts)
    .filter(([name]) => name.includes('build'));
  
  buildScripts.forEach(([name, script]) => {
    console.log(`${name}: ${script}`);
    if (!script.includes('STRIPE')) {
      console.log('   ⚠️  Warning: Build script does not include Stripe environment variables');
    }
  });
  
  console.log('\n📋 Required Stripe Environment Variables:');
  console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client-side)');
  console.log('- STRIPE_SECRET_KEY (server-side)');
  console.log('- STRIPE_WEBHOOK_SECRET (optional, for webhooks)');
  console.log('- STRIPE_PRICE_* (for subscription price IDs)');
  
  console.log('\n🚀 Deployment Checklist:');
  console.log('1. ✅ Updated next.config.js to include NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in env section');
  console.log('2. ✅ Updated next.config.render.js for Render deployment');
  console.log('3. ✅ Enhanced payment page with debugging and error handling');
  console.log('4. ⚠️  Ensure Stripe environment variables are set in Render dashboard:');
  console.log('   - Go to https://dashboard.render.com');
  console.log('   - Select your service');
  console.log('   - Go to Environment tab');
  console.log('   - Add the following variables:');
  console.log('     * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_51RI9epFls6i75mQBc3JI8lpcOUnaMlYAGmbDgOrIylbAqUaCOG035DlZFz35vneimME1QmdSiFiObsv3kcnCSNFi000AABL5EU');
  console.log('     * STRIPE_SECRET_KEY = sk_test_51RI9epFls6i75mQBv6NFscXgAuBHwHJg3JUxiqZIwbBktV5S9saUMGrCYqbr5r0ksjgswLXz6KVErzRRDUsDqVSq00wWr5hbIN');
  console.log('     * STRIPE_PRICE_PROFESSIONAL_MONTHLY = price_1RZMDhFls6i75mQBM7o13PWb');
  console.log('     * STRIPE_PRICE_PROFESSIONAL_YEARLY = price_1RZMDhFls6i75mQB2M0DOulV');
  console.log('     * STRIPE_PRICE_ENTERPRISE_MONTHLY = price_1RZMDhFls6i75mQB9kMjeKtx');
  console.log('     * STRIPE_PRICE_ENTERPRISE_YEARLY = price_1RZMDiFls6i75mQBqQwHnERW');
  
  console.log('\n💡 Debugging Tips:');
  console.log('- Check browser console for [Stripe Debug] logs');
  console.log('- Look for "Payment System Configuration Issue" message on payment page');
  console.log('- Verify environment variables are loaded during build (check build logs)');
  console.log('- Test with development mode first to see debug information');
}

// Run the check
checkEnvFiles().catch(console.error);