#!/usr/bin/env node

/**
 * Health Check Test Script
 * Tests all critical endpoints including new Cloudinary integration
 */

const fetch = require('node-fetch');
const https = require('https');

// Configuration
const API_URL = 'https://dott-api-staging.onrender.com/api';
const TEST_TOKEN = process.env.TEST_TOKEN || ''; // You'll need to provide a valid token

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test endpoints
const endpoints = [
  // Authentication
  { category: 'Auth', method: 'GET', path: '/users/me/', name: 'User Profile', requiresAuth: true },
  
  // Business Operations
  { category: 'Business', method: 'GET', path: '/users/business/details/', name: 'Business Details', requiresAuth: true },
  
  // Marketplace
  { category: 'Marketplace', method: 'GET', path: '/marketplace/consumer/categories/', name: 'Categories', requiresAuth: false },
  
  // Chat & Media (NEW Cloudinary endpoints)
  { category: 'Chat', method: 'GET', path: '/chat/conversations/', name: 'Chat Conversations', requiresAuth: true },
  { category: 'Cloudinary', method: 'GET', path: '/chat/cloudinary-usage/', name: 'Cloudinary Usage', requiresAuth: true, adminOnly: true },
  
  // POS & Transactions
  { category: 'POS', method: 'GET', path: '/sales/pos/transactions/', name: 'POS Transactions', requiresAuth: true },
  
  // Payments
  { category: 'Payments', method: 'GET', path: '/payments/wallet/balance/', name: 'Wallet Balance', requiresAuth: true },
  
  // Couriers
  { category: 'Couriers', method: 'GET', path: '/couriers/profile/', name: 'Courier Profile', requiresAuth: true },
];

// Test a single endpoint
async function testEndpoint(endpoint) {
  const url = `${API_URL}${endpoint.path}`;
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  };

  // Add auth token if required
  if (endpoint.requiresAuth && TEST_TOKEN) {
    options.headers['Authorization'] = `Bearer ${TEST_TOKEN}`;
  }

  try {
    console.log(`${colors.cyan}Testing:${colors.reset} ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
    
    const startTime = Date.now();
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;

    let status = 'UNKNOWN';
    let color = colors.yellow;
    let details = '';

    if (response.ok) {
      status = 'OK';
      color = colors.green;
      details = `(${response.status} - ${responseTime}ms)`;
    } else if (response.status === 401 && endpoint.requiresAuth && !TEST_TOKEN) {
      status = 'AUTH REQUIRED';
      color = colors.yellow;
      details = '(Need valid token)';
    } else if (response.status === 403 && endpoint.adminOnly) {
      status = 'ADMIN ONLY';
      color = colors.yellow;
      details = '(Requires admin access)';
    } else if (response.status === 404) {
      status = 'NOT FOUND';
      color = colors.red;
      details = `(${response.status})`;
    } else {
      status = 'ERROR';
      color = colors.red;
      details = `(${response.status})`;
    }

    console.log(`  ${color}✔ ${status}${colors.reset} ${details}`);
    
    return {
      endpoint: endpoint.name,
      status,
      statusCode: response.status,
      responseTime,
      success: response.ok || (response.status === 401 && !TEST_TOKEN)
    };

  } catch (error) {
    console.log(`  ${colors.red}✗ ERROR${colors.reset} (${error.message})`);
    return {
      endpoint: endpoint.name,
      status: 'ERROR',
      error: error.message,
      success: false
    };
  }
}

// Main test function
async function runHealthCheck() {
  console.log(`${colors.magenta}================================${colors.reset}`);
  console.log(`${colors.magenta}  API Health Check Test${colors.reset}`);
  console.log(`${colors.magenta}  Target: ${API_URL}${colors.reset}`);
  console.log(`${colors.magenta}================================${colors.reset}\n`);

  if (!TEST_TOKEN) {
    console.log(`${colors.yellow}⚠️  Warning: No auth token provided${colors.reset}`);
    console.log(`${colors.yellow}   Set TEST_TOKEN environment variable for authenticated endpoints${colors.reset}\n`);
  }

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    categories: {}
  };

  // Group by category
  const categories = [...new Set(endpoints.map(e => e.category))];
  
  for (const category of categories) {
    console.log(`\n${colors.blue}[${category}]${colors.reset}`);
    console.log('─'.repeat(40));
    
    const categoryEndpoints = endpoints.filter(e => e.category === category);
    results.categories[category] = { total: 0, success: 0 };
    
    for (const endpoint of categoryEndpoints) {
      const result = await testEndpoint(endpoint);
      results.total++;
      results.categories[category].total++;
      
      if (result.success) {
        results.success++;
        results.categories[category].success++;
      } else {
        results.failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log(`\n${colors.magenta}================================${colors.reset}`);
  console.log(`${colors.magenta}  Summary${colors.reset}`);
  console.log(`${colors.magenta}================================${colors.reset}`);
  
  console.log(`\nTotal Endpoints: ${results.total}`);
  console.log(`${colors.green}✔ Success: ${results.success}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${results.failed}${colors.reset}`);
  
  console.log('\nBy Category:');
  for (const [category, stats] of Object.entries(results.categories)) {
    const successRate = ((stats.success / stats.total) * 100).toFixed(0);
    const color = successRate === '100' ? colors.green : successRate >= '50' ? colors.yellow : colors.red;
    console.log(`  ${category}: ${color}${successRate}%${colors.reset} (${stats.success}/${stats.total})`);
  }

  // Check Cloudinary specifically
  console.log(`\n${colors.cyan}Cloudinary Integration:${colors.reset}`);
  if (TEST_TOKEN) {
    console.log('  Testing Cloudinary connection...');
    try {
      const response = await fetch(`${API_URL}/chat/cloudinary-usage/`, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`  ${colors.green}✔ Cloudinary Connected${colors.reset}`);
        if (data.usage) {
          console.log(`    Storage: ${data.usage.storage_used_gb}/${data.usage.storage_limit_gb} GB`);
          console.log(`    Bandwidth: ${data.usage.bandwidth_used_gb}/${data.usage.bandwidth_limit_gb} GB`);
        }
      } else if (response.status === 403) {
        console.log(`  ${colors.yellow}⚠️  Admin access required for usage stats${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ Cloudinary not configured${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ Could not check Cloudinary${colors.reset}`);
    }
  } else {
    console.log(`  ${colors.yellow}⚠️  Need auth token to test Cloudinary${colors.reset}`);
  }

  console.log(`\n${colors.magenta}================================${colors.reset}\n`);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the health check
runHealthCheck().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});