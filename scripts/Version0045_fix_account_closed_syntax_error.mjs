#!/usr/bin/env node

/**
 * Version 0.045 - Fix Account Closed Page Syntax Error
 * 
 * This script fixes the syntax error in account-closed page that's preventing the build.
 * The issue is on line 29 where there's extra text after console.log
 * 
 * @fixes build-syntax-error-account-closed
 * @affects frontend/pyfactor_next/src/app/account-closed/page.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend', 'pyfactor_next');

async function fixAccountClosedPage() {
  console.log('🔧 Fixing account-closed page syntax error...');
  
  const pagePath = path.join(frontendDir, 'src', 'app', 'account-closed', 'page.js');
  
  // Read the file
  let content = await fs.readFile(pagePath, 'utf-8');
  
  // Fix the syntax error on line 29
  // The issue is: console.log('[ACCOUNT_CLOSED] Cleared all cookies'); on mount and set up redirect
  // Should be: console.log('[ACCOUNT_CLOSED] Cleared all cookies'); // on mount and set up redirect
  content = content.replace(
    /console\.log\('\[ACCOUNT_CLOSED\] Cleared all cookies'\); on mount and set up redirect/,
    "console.log('[ACCOUNT_CLOSED] Cleared all cookies');"
  );
  
  // Also ensure the useEffect is properly placed
  // The cleanup code should be inside a useEffect
  if (!content.includes('useEffect(() => {') || content.indexOf('// Clear any remaining auth data') < content.indexOf('useEffect(() => {')) {
    // Restructure the component to have cleanup in useEffect
    const restructuredContent = `'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccountClosed() {
  const router = useRouter();
  
  useEffect(() => {
    console.log('[ACCOUNT_CLOSED] User reached account-closed page');
    
    // Clear any remaining auth data
    console.log('[ACCOUNT_CLOSED] Performing final cleanup');
    
    // Clear all storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('[ACCOUNT_CLOSED] Cleared all storage');
    } catch (e) {
      console.error('[ACCOUNT_CLOSED] Error clearing storage:', e);
    }
    
    // Clear all accessible cookies
    document.cookie.split(";").forEach(function(c) { 
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.dottapps.com";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    console.log('[ACCOUNT_CLOSED] Cleared all cookies');
    
    // Set up redirect timer
    const timer = setTimeout(() => {
      console.log('[ACCOUNT_CLOSED] Redirecting to home page');
      router.push('/');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Account Closed Successfully
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account has been permanently closed and all data has been removed.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            You will be redirected to the homepage in 5 seconds...
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signup"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create a New Account
          </Link>
          
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
`;
    content = restructuredContent;
  }
  
  await fs.writeFile(pagePath, content);
  console.log('✅ Fixed account-closed page syntax error');
}

async function validateFix() {
  console.log('\n🔍 Validating fix...');
  
  const pagePath = path.join(frontendDir, 'src', 'app', 'account-closed', 'page.js');
  const content = await fs.readFile(pagePath, 'utf-8');
  
  // Check for the problematic pattern
  if (content.includes('); on mount and set up redirect')) {
    console.error('❌ Syntax error still present!');
    return false;
  }
  
  // Check that useEffect is properly structured
  if (!content.includes('useEffect(() => {')) {
    console.error('❌ useEffect not found!');
    return false;
  }
  
  console.log('✅ Syntax error has been fixed!');
  return true;
}

async function main() {
  console.log('🚀 Starting Account Closed Page Fix - Version 0.045');
  console.log('=' .repeat(50));
  
  try {
    // Fix the syntax error
    await fixAccountClosedPage();
    
    // Validate the fix
    const isValid = await validateFix();
    
    if (isValid) {
      console.log('\n✅ Account closed page has been fixed!');
      console.log('=' .repeat(50));
      console.log('\n🎯 Next steps:');
      console.log('1. Commit this fix');
      console.log('2. Push to trigger a new build');
      console.log('3. The build should now complete successfully');
    } else {
      console.error('\n❌ Fix validation failed. Please check manually.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);