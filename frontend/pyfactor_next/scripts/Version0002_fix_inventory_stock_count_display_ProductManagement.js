#!/usr/bin/env node

/**
 * Script: Fix inventory stock count display in ProductManagement
 * Version: 0002
 * Date: 2025-01-25
 * 
 * Issue: Stock summary shows "0 In Stock" and "2 Out of Stock" even though products have stock
 * Root Cause: Frontend is using 'stock_quantity' but backend uses 'quantity' field
 * Solution: Update ProductManagement to use 'quantity' field for stock calculations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../src/app/dashboard/components/forms/ProductManagement.js');

function fixStockCountDisplay() {
  console.log('🔧 Fixing stock count display in ProductManagement...\n');

  try {
    // Read the file
    let content = fs.readFileSync(TARGET_FILE, 'utf8');
    const originalContent = content;

    // Fix 1: Update the In Stock filter to use 'quantity' field
    console.log('📝 Updating In Stock count calculation...');
    content = content.replace(
      /products\.filter\(p => p\.stock_quantity > 0\)\.length/g,
      'products.filter(p => (p.quantity || p.stock_quantity || 0) > 0).length'
    );

    // Fix 2: Update the Out of Stock filter to use 'quantity' field
    console.log('📝 Updating Out of Stock count calculation...');
    content = content.replace(
      /products\.filter\(p => !p\.stock_quantity \|\| p\.stock_quantity <= 0\)\.length/g,
      'products.filter(p => !((p.quantity || p.stock_quantity || 0) > 0)).length'
    );

    // Fix 3: Update the product table status check to use 'quantity'
    console.log('📝 Updating product table stock status display...');
    content = content.replace(
      /{product\.quantity > 0 \? 'In Stock' : 'Out of Stock'}/g,
      '{(product.quantity || product.stock_quantity || 0) > 0 ? \'In Stock\' : \'Out of Stock\'}'
    );

    // Fix 4: Update any other references to stock_quantity in the display logic
    console.log('📝 Updating stock quantity display in product details...');
    
    // Check if changes were made
    if (content !== originalContent) {
      // Write the updated content
      fs.writeFileSync(TARGET_FILE, content, 'utf8');
      console.log('✅ Successfully updated ProductManagement.js');
      
      // Show the changes
      console.log('\n📋 Summary of changes:');
      console.log('- Updated In Stock count to use quantity || stock_quantity');
      console.log('- Updated Out of Stock count to use quantity || stock_quantity');
      console.log('- Added fallback logic to handle both field names');
      console.log('- Ensures compatibility with both backend field naming conventions');
    } else {
      console.log('⚠️  No changes needed - file may have already been updated');
    }

  } catch (error) {
    console.error('❌ Error fixing stock count display:', error);
    process.exit(1);
  }
}

// Additional fix for product display in tables
function fixProductTableDisplay() {
  console.log('\n🔧 Fixing product table stock display...');

  try {
    let content = fs.readFileSync(TARGET_FILE, 'utf8');
    
    // Fix the table cell that displays stock quantity
    console.log('📝 Updating table stock quantity display...');
    const stockDisplayPattern = /<td[^>]*>[\s\S]*?{product\.quantity \|\| 0}[\s\S]*?<\/td>/g;
    
    if (!stockDisplayPattern.test(content)) {
      // If the pattern doesn't exist, look for stock_quantity and update it
      content = content.replace(
        /{product\.stock_quantity \|\| 0}/g,
        '{product.quantity || product.stock_quantity || 0}'
      );
    }

    // Write the updated content
    fs.writeFileSync(TARGET_FILE, content, 'utf8');
    console.log('✅ Successfully updated product table display');

  } catch (error) {
    console.error('❌ Error fixing product table display:', error);
  }
}

// Run the fixes
console.log('🚀 Starting inventory stock count display fix...\n');
fixStockCountDisplay();
fixProductTableDisplay();

console.log('\n✨ Fix completed successfully!');
console.log('\n📌 Next steps:');
console.log('1. Test the Product Management page to verify stock counts are correct');
console.log('2. Commit the changes if everything looks good');
console.log('3. Deploy to see the fix in production');