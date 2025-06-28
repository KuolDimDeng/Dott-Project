#!/usr/bin/env node

/**
 * Script to update all Sales menu components to use StandardSpinner
 * This ensures consistent loading states across all Sales pages
 */

const fs = require('fs');
const path = require('path');

// Sales menu files to update
const salesFiles = [
  'src/app/dashboard/components/forms/ProductManagement.js',
  'src/app/dashboard/components/forms/ServiceManagement.js',
  'src/app/dashboard/components/forms/CustomerManagement.js',
  'src/app/dashboard/components/forms/EstimateManagement.js',
  'src/app/dashboard/components/forms/InvoiceManagement.js',
  'src/app/dashboard/components/forms/SalesReportsManagement.js'
];

// Pattern replacements
const replacements = [
  // SVG spinner patterns
  {
    pattern: /<svg[^>]*className="[^"]*animate-spin[^"]*"[^>]*>[\s\S]*?<\/svg>/g,
    replacement: '<ButtonSpinner />',
    context: 'button'
  },
  // Loading spinner patterns - various indentations
  {
    pattern: /<div className="animate-spin rounded-full h-8 w-8 border-[tb]-2 border-[^"]+"><\/div>/g,
    replacement: '<StandardSpinner size="default" />',
    context: 'loading'
  },
  {
    pattern: /<div className="animate-spin rounded-full h-10 w-10 border-[tb]-2 border-[^"]+"><\/div>/g,
    replacement: '<StandardSpinner size="large" />',
    context: 'loading'
  },
  {
    pattern: /<div className="animate-spin rounded-full h-12 w-12 border-[tb]-2 border-[^"]+"><\/div>/g,
    replacement: '<StandardSpinner size="large" />',
    context: 'loading'
  },
  // Button spinner patterns
  {
    pattern: /<div className="animate-spin[^"]*h-4 w-4[^"]*border-[^"]+"><\/div>/g,
    replacement: '<ButtonSpinner />',
    context: 'button'
  },
  // Circle animation patterns
  {
    pattern: /<circle[^>]*className="opacity-25"[^>]*\/>\s*<circle[^>]*className="opacity-75"[^>]*strokeDasharray[^>]*\/>/g,
    replacement: '',
    context: 'svg-inner'
  }
];

// Process each file
salesFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Special handling for ProductManagement.js which already has StandardSpinner
  const isProductManagement = filePath.includes('ProductManagement');
  
  // Check if StandardSpinner is already imported
  const hasStandardSpinnerImport = content.includes("import StandardSpinner") || 
                                   content.includes("import { ButtonSpinner");
  
  // Apply replacements
  replacements.forEach(({ pattern, replacement, context }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  Found ${matches.length} ${context} spinner(s) to replace`);
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });
  
  // Additional specific replacements
  if (content.includes('animate-spin')) {
    // Replace remaining animate-spin patterns
    const remainingSpinners = content.match(/animate-spin[^"'\s]*/g);
    if (remainingSpinners) {
      console.log(`  Found ${remainingSpinners.length} additional spinner(s)`);
      modified = true;
    }
  }
  
  if (modified) {
    // Add import if not present and not ProductManagement
    if (!hasStandardSpinnerImport && !isProductManagement) {
      // Find the last import statement
      const importMatch = content.match(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        
        // Check what components we need
        const needsButtonSpinner = content.includes('<ButtonSpinner');
        const needsStandardSpinner = content.includes('<StandardSpinner') && !content.includes('<ButtonSpinner');
        
        let importStatement = '';
        if (needsButtonSpinner) {
          importStatement = "\nimport StandardSpinner, { ButtonSpinner } from '@/components/ui/StandardSpinner';";
        } else if (needsStandardSpinner) {
          importStatement = "\nimport StandardSpinner from '@/components/ui/StandardSpinner';";
        }
        
        if (importStatement) {
          content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
        }
      }
    }
    
    // Write the updated content
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
});

console.log('\n🎯 Sales menu spinner update complete!');
console.log('\nNote: Please manually review complex spinner implementations, especially in ProductManagement.js');