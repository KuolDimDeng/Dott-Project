#!/usr/bin/env node

/**
 * Fix "Invalid time value" error in payment components
 * This script removes the problematic toLocaleTimeString() calls
 * that cause rendering issues in production
 */

const fs = require('fs');
const path = require('path');

const paymentComponents = [
  'PaymentsDashboard.js',
  'ReceivePayments.js',
  'MakePayments.js',
  'PaymentMethods.js',
  'RecurringPayments.js',
  'RefundsManagement.js',
  'PaymentReconciliation.js',
  'PaymentGateways.js',
  'PaymentPlans.js',
  'PaymentReports.js'
];

const formsDir = path.join(__dirname, '../src/app/dashboard/components/forms');

paymentComponents.forEach(filename => {
  const filepath = path.join(formsDir, filename);
  
  if (fs.existsSync(filepath)) {
    console.log(`Processing ${filename}...`);
    
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Remove toLocaleTimeString() calls from debug lines
    const pattern = /Last Updated: \{new Date\(\)\.toLocaleTimeString\(\)\}/g;
    if (content.match(pattern)) {
      content = content.replace(pattern, '');
      
      // Also clean up any double pipes that might result
      content = content.replace(/\s*\|\s*\|/g, ' |');
      content = content.replace(/\s*\|\s*$/gm, '');
      
      fs.writeFileSync(filepath, content);
      console.log(`✓ Fixed ${filename}`);
    } else {
      console.log(`- ${filename} already fixed or doesn't have the issue`);
    }
  } else {
    console.log(`✗ ${filename} not found`);
  }
});

console.log('\nDone! Payment components should now render without time errors.');