#!/usr/bin/env node

/**
 * Test Sign-In Functionality Script
 * 
 * This script tests the sign-in functionality to verify that the
 * "NetworkError: A network error has occurred" issue has been resolved.
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'https://dottapps.com';

async function testSignInFunctionality() {
  console.log('🔍 Testing Sign-In Functionality');
  console.log('='.repeat(80));
  
  let browser;
  let results = {
    pageLoad: false,
    amplifyConfig: false,
    signInPageAccess: false,
    signInFormVisible: false,
    networkErrorsDetected: false,
    signInAttemptMade: false,
    enhancedErrorHandling: false
  };
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set up console monitoring
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      
      // Log important messages
      if (text.includes('[AmplifyUnified]') || 
          text.includes('NetworkError') || 
          text.includes('sign')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${msg.type().toUpperCase()}: ${text}`);
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log(`[ERROR] ${error.message}`);
    });
    
    // Navigate to home page first
    console.log('🌐 Step 1: Navigating to home page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    results.pageLoad = true;
    console.log('✅ Home page loaded');
    
    // Wait for Amplify to be configured
    console.log('🔧 Step 2: Waiting for Amplify configuration...');
    await page.waitForTimeout(3000);
    
    // Check if Amplify configured successfully
    const amplifyConfigured = consoleMessages.some(msg => 
      msg.includes('Amplify configured successfully')
    );
    results.amplifyConfig = amplifyConfigured;
    
    if (amplifyConfigured) {
      console.log('✅ Amplify configured successfully');
    } else {
      console.log('⚠️  Amplify configuration not detected');
    }
    
    // Navigate to sign-in page
    console.log('🔐 Step 3: Navigating to sign-in page...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle0', timeout: 30000 });
    results.signInPageAccess = true;
    console.log('✅ Sign-in page loaded');
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Check if sign-in form is visible
    console.log('📋 Step 4: Checking sign-in form visibility...');
    try {
      await page.waitForSelector('input[type="email"], input[name="username"], input[name="email"]', { timeout: 10000 });
      results.signInFormVisible = true;
      console.log('✅ Sign-in form is visible');
    } catch (error) {
      console.log('⚠️  Sign-in form not found');
    }
    
    // Test sign-in functionality with test credentials
    console.log('🧪 Step 5: Testing sign-in functionality...');
    try {
      // Fill in test credentials (these will fail but we want to test the network handling)
      const emailSelector = 'input[type="email"], input[name="username"], input[name="email"]';
      const passwordSelector = 'input[type="password"], input[name="password"]';
      
      const emailInput = await page.$(emailSelector);
      const passwordInput = await page.$(passwordSelector);
      
      if (emailInput && passwordInput) {
        await emailInput.type('test@example.com');
        await passwordInput.type('testpassword123');
        
        console.log('📝 Test credentials entered');
        
        // Find and click sign-in button
        const signInButton = await page.$('button[type="submit"], button:contains("Sign"), button:contains("Log")');
        
        if (signInButton) {
          console.log('🔄 Attempting sign-in...');
          
          // Monitor console for network errors during sign-in
          const preSignInMessages = consoleMessages.length;
          
          await signInButton.click();
          results.signInAttemptMade = true;
          
          // Wait to see what happens
          await page.waitForTimeout(5000);
          
          // Check for new console messages
          const newMessages = consoleMessages.slice(preSignInMessages);
          
          // Look for network errors
          const networkErrors = newMessages.filter(msg => 
            msg.includes('NetworkError') || 
            msg.includes('network error') ||
            msg.includes('Network error')
          );
          
          results.networkErrorsDetected = networkErrors.length > 0;
          
          // Look for enhanced error handling
          const enhancedHandling = newMessages.filter(msg =>
            msg.includes('[AmplifyUnified]') ||
            msg.includes('retrying') ||
            msg.includes('attempt') ||
            msg.includes('connectivity test') ||
            msg.includes('network diagnostic')
          );
          
          results.enhancedErrorHandling = enhancedHandling.length > 0;
          
          if (networkErrors.length > 0) {
            console.log('❌ Network errors detected:');
            networkErrors.forEach(error => console.log(`   - ${error}`));
          } else {
            console.log('✅ No NetworkError detected during sign-in attempt');
          }
          
          if (enhancedHandling.length > 0) {
            console.log('✅ Enhanced error handling detected:');
            enhancedHandling.forEach(msg => console.log(`   - ${msg}`));
          }
          
        } else {
          console.log('⚠️  Sign-in button not found');
        }
      } else {
        console.log('⚠️  Email or password input not found');
      }
    } catch (error) {
      console.log(`⚠️  Error during sign-in test: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const checks = [
    { name: 'Page Load', status: results.pageLoad },
    { name: 'Amplify Configuration', status: results.amplifyConfig },
    { name: 'Sign-in Page Access', status: results.signInPageAccess },
    { name: 'Sign-in Form Visible', status: results.signInFormVisible },
    { name: 'Sign-in Attempt Made', status: results.signInAttemptMade },
    { name: 'Enhanced Error Handling', status: results.enhancedErrorHandling }
  ];
  
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.status ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\n🚨 Network Errors Detected: ${results.networkErrorsDetected ? 'YES ❌' : 'NO ✅'}`);
  
  const overallSuccess = checks.every(check => check.status) && !results.networkErrorsDetected;
  
  console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? 'SUCCESS ✅' : 'NEEDS ATTENTION ⚠️'}`);
  
  if (overallSuccess) {
    console.log('\n🎉 Sign-in functionality test completed successfully!');
    console.log('The NetworkError issue appears to be resolved.');
  } else {
    console.log('\n⚠️  Some issues detected. Please review the results above.');
  }
}

// Run the test
testSignInFunctionality().catch(console.error); 