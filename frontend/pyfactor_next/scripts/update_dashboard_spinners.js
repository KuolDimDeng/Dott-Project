#!/usr/bin/env node

/**
 * Script to update all dashboard components to use StandardSpinner
 * This ensures consistent loading states across the application
 */

const fs = require('fs');
const path = require('path');

// Dashboard files to update
const dashboardFiles = [
  'src/app/dashboard/components/forms/SalesDashboard.js',
  'src/app/dashboard/components/forms/PaymentsDashboard.js',
  'src/app/dashboard/components/forms/InventoryDashboard.js',
  'src/app/dashboard/components/forms/AccountingDashboard.js',
  'src/app/dashboard/components/forms/BankingDashboard.js',
  'src/app/dashboard/components/forms/ReportsDashboard.js',
  'src/app/dashboard/components/forms/PurchasesDashboard.js',
  'src/app/dashboard/components/forms/TaxesDashboard.js',
  'src/app/dashboard/components/forms/KPIDashboard.js',
  'src/app/dashboard/components/forms/TransportDashboard.js',
  'src/app/dashboard/components/forms/CRMDashboard.js',
  'src/app/dashboard/components/forms/DiagnosticPanel.js'
];

// Pattern to match custom spinners
const spinnerPatterns = [
  /<div className="animate-spin rounded-full h-\d+ w-\d+ border-[tb]-2 border-\w+-\d+"><\/div>/g,
  /<div className="animate-spin rounded-full h-\d+ w-\d+ border-b-2 border-\w+-\d+"><\/div>/g,
];

// Replacement based on context
const getSpinnerReplacement = (match, fileContent, matchIndex) => {
  // Check if it's in a centered context by looking at parent div
  const beforeMatch = fileContent.substring(Math.max(0, matchIndex - 100), matchIndex);
  
  if (beforeMatch.includes('flex') && beforeMatch.includes('center')) {
    // Already centered, just replace with StandardSpinner
    return '<StandardSpinner size="large" />';
  } else {
    // Use CenteredSpinner for full-page loading
    return '<CenteredSpinner size="large" minHeight="h-64" />';
  }
};

// Process each file
dashboardFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Check if StandardSpinner is already imported
  const hasStandardSpinnerImport = content.includes("import StandardSpinner") || 
                                   content.includes("import { CenteredSpinner }") ||
                                   content.includes("import { StandardSpinner");
  
  // Replace all spinner patterns
  spinnerPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, (match, offset) => {
        modified = true;
        return getSpinnerReplacement(match, content, offset);
      });
    }
  });
  
  if (modified) {
    // Add import if not present
    if (!hasStandardSpinnerImport) {
      // Find the last import statement
      const importMatch = content.match(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        
        // Check if we need CenteredSpinner
        const needsCenteredSpinner = content.includes('<CenteredSpinner');
        const importStatement = needsCenteredSpinner 
          ? "\nimport { CenteredSpinner } from '@/components/ui/StandardSpinner';"
          : "\nimport StandardSpinner from '@/components/ui/StandardSpinner';";
        
        content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
      }
    }
    
    // Write the updated content
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
});

console.log('\n✨ Dashboard spinner update complete!');