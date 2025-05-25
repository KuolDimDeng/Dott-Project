#!/usr/bin/env node

/**
 * test_console_logs.mjs
 * 
 * Test script to capture console logs and errors from dottapps.com
 * Runs headless browser and outputs all console messages to terminal
 */

import puppeteer from 'puppeteer';

const TARGET_URL = 'https://dottapps.com';
const WAIT_TIME = 10000; // Wait 10 seconds for page to fully load

console.log('🔍 Testing Console Logs from', TARGET_URL);
console.log('=' .repeat(60));

async function testConsoleLogs() {
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
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
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Capture console messages
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      
      consoleMessages.push({ type, text, timestamp });
      
      // Color code different log levels
      let colorCode = '';
      let resetCode = '\x1b[0m';
      
      switch (type) {
        case 'error':
          colorCode = '\x1b[31m'; // Red
          break;
        case 'warning':
          colorCode = '\x1b[33m'; // Yellow
          break;
        case 'info':
          colorCode = '\x1b[34m'; // Blue
          break;
        case 'log':
          colorCode = '\x1b[37m'; // White
          break;
        default:
          colorCode = '\x1b[37m'; // White
      }
      
      console.log(`${colorCode}[${timestamp}] ${type.toUpperCase()}: ${text}${resetCode}`);
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      errors.push({ error: error.message, timestamp });
      console.log(`\x1b[31m[${timestamp}] PAGE ERROR: ${error.message}\x1b[0m`);
    });
    
    // Capture request failures
    page.on('requestfailed', request => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`\x1b[33m[${timestamp}] REQUEST FAILED: ${request.url()} - ${request.failure().errorText}\x1b[0m`);
    });
    
    console.log('🌐 Navigating to', TARGET_URL);
    
    // Navigate to the page
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('⏳ Waiting for page to fully load and scripts to execute...');
    
    // Wait for additional time to capture all console logs
    await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
    
    // Check for specific elements to ensure page loaded
    try {
      await page.waitForSelector('body', { timeout: 5000 });
      console.log('✅ Page body loaded successfully');
    } catch (error) {
      console.log('❌ Page body not found');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    
    const errorCount = consoleMessages.filter(msg => msg.type === 'error').length;
    const warningCount = consoleMessages.filter(msg => msg.type === 'warning').length;
    const infoCount = consoleMessages.filter(msg => msg.type === 'info' || msg.type === 'log').length;
    
    console.log(`Total Messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Warnings: ${warningCount}`);
    console.log(`Info/Log: ${infoCount}`);
    console.log(`Page Errors: ${errors.length}`);
    
    // Check for specific issues
    const hubErrors = consoleMessages.filter(msg => 
      msg.text.includes('Hub is undefined') || 
      msg.text.includes('d.Hub is undefined')
    );
    
    const amplifySuccessMessages = consoleMessages.filter(msg => 
      msg.text.includes('Amplify configured successfully')
    );
    
    const cognitoSuccessMessages = consoleMessages.filter(msg => 
      msg.text.includes('Successfully retrieved profile from Cognito')
    );
    
    console.log('\n🎯 SPECIFIC CHECKS:');
    console.log(`Hub Undefined Errors: ${hubErrors.length} ${hubErrors.length === 0 ? '✅' : '❌'}`);
    console.log(`Amplify Success Messages: ${amplifySuccessMessages.length} ${amplifySuccessMessages.length > 0 ? '✅' : '❌'}`);
    console.log(`Cognito Success Messages: ${cognitoSuccessMessages.length} ${cognitoSuccessMessages.length > 0 ? '✅' : '❌'}`);
    
    // Final status
    if (hubErrors.length === 0 && amplifySuccessMessages.length > 0) {
      console.log('\n🎉 SUCCESS: No Hub errors detected and Amplify configured successfully!');
    } else if (hubErrors.length > 0) {
      console.log('\n⚠️  ISSUE: Hub undefined errors still present');
    } else {
      console.log('\n❓ UNCLEAR: Check logs above for details');
    }
    
  } catch (error) {
    console.error('❌ Error testing console logs:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testConsoleLogs(); 