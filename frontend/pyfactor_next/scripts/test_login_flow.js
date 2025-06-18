#!/usr/bin/env node

/**
 * Test script to simulate the login flow locally
 * This helps debug the session establishment issue without deploying
 * 
 * Usage: node scripts/test_login_flow.js
 */

import { chromium } from 'playwright';
import chalk from 'chalk';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

async function testLoginFlow() {
  console.log(chalk.blue('🧪 Testing login flow locally...\n'));
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI/CD
    devtools: true  // Opens DevTools automatically
  });
  
  const context = await browser.newContext({
    // Clear all cookies/storage to simulate cleared cache
    storageState: undefined
  });
  
  // Log all console messages from the page
  context.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(chalk.red(`[Browser Error] ${msg.text()}`));
    } else if (msg.text().includes('[SessionBridge]') || msg.text().includes('[EstablishSession]')) {
      console.log(chalk.yellow(`[Browser Log] ${msg.text()}`));
    }
  });
  
  // Log network requests
  context.on('request', request => {
    if (request.url().includes('/api/auth/')) {
      console.log(chalk.cyan(`[Network] ${request.method()} ${request.url()}`));
    }
  });
  
  context.on('response', response => {
    if (response.url().includes('/api/auth/')) {
      console.log(chalk.green(`[Response] ${response.status()} ${response.url()}`));
      if (response.status() >= 300 && response.status() < 400) {
        console.log(chalk.yellow(`[Redirect] Location: ${response.headers()['location']}`));
      }
    }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Clear all cookies and storage (simulating cache clear)
    console.log(chalk.blue('\n1️⃣ Clearing all cookies and storage...'));
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Step 2: Navigate to login page
    console.log(chalk.blue('\n2️⃣ Navigating to login page...'));
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // Step 3: Fill in login form
    console.log(chalk.blue('\n3️⃣ Filling login form...'));
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // Step 4: Click login button
    console.log(chalk.blue('\n4️⃣ Clicking login button...'));
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // Step 5: Check where we ended up
    const currentUrl = page.url();
    console.log(chalk.blue(`\n5️⃣ Current URL: ${currentUrl}`));
    
    // Step 6: Check cookies
    const cookies = await context.cookies();
    console.log(chalk.blue('\n6️⃣ Cookies after login:'));
    cookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
    });
    
    // Step 7: Check sessionStorage
    const sessionStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        data[key] = sessionStorage.getItem(key);
      }
      return data;
    });
    console.log(chalk.blue('\n7️⃣ SessionStorage:'), sessionStorageData);
    
    // Step 8: Try to access a protected route
    console.log(chalk.blue('\n8️⃣ Trying to access dashboard...'));
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log(chalk.blue(`\n9️⃣ Final URL: ${finalUrl}`));
    
    // Success check
    if (finalUrl.includes('/dashboard') && !finalUrl.includes('signin')) {
      console.log(chalk.green('\n✅ Login successful! Dashboard loaded.'));
    } else {
      console.log(chalk.red('\n❌ Login failed! Redirected to:', finalUrl));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
  } finally {
    // Keep browser open for manual inspection
    console.log(chalk.yellow('\n⏸️  Browser will stay open for 30 seconds for inspection...'));
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

// Run the test
testLoginFlow().catch(console.error);