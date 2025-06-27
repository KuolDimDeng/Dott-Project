#!/usr/bin/env node

/**
 * Fix payment navigation by removing duplicate handlePaymentsClick calls
 * The menuNavigation event alone should handle the navigation
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/dashboard/components/lists/listItems.js');

console.log('=== Fixing Payment Navigation Handlers ===\n');
console.log('Reading listItems.js...');

let content = fs.readFileSync(filePath, 'utf8');
const originalContent = content;

// Pattern to find handlePaymentsClick calls in payment menu items
const pattern = /\/\/ Load the \w+ component\s*\n\s*if \(typeof handlePaymentsClick === 'function'\) \{\s*\n\s*handlePaymentsClick\(['"][\w-]+['"]\);\s*\n\s*\}/g;

// Count occurrences
const matches = content.match(pattern);
if (matches) {
  console.log(`Found ${matches.length} handlePaymentsClick calls to remove`);
  
  // Replace with a comment explaining the removal
  content = content.replace(pattern, '// Note: Removed handlePaymentsClick call to prevent double navigation\n            // The menuNavigation event handler in DashboardContent will handle the view update');
  
  // Write the file back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Successfully removed handlePaymentsClick calls');
  console.log('   Payment navigation will now use only the menuNavigation event');
} else {
  console.log('✅ No handlePaymentsClick calls found - file may already be fixed');
}

// Verify the changes
const updatedContent = fs.readFileSync(filePath, 'utf8');
const remainingCalls = updatedContent.match(/handlePaymentsClick\(['"]payment/g);
if (remainingCalls) {
  console.log(`\n⚠️  Warning: Still found ${remainingCalls.length} payment-related handlePaymentsClick calls`);
} else {
  console.log('\n✅ All payment handlePaymentsClick calls have been removed');
}

console.log('\nDone!');