#!/usr/bin/env node

/**
 * Script to update Accounting, Banking, and HR menu components to use StandardSpinner
 * Version: 0001_update_accounting_banking_hr_spinners
 */

const fs = require('fs');
const path = require('path');

// Component groups
const componentGroups = {
  Accounting: [
    'AccountingDashboard.js',
    'ChartOfAccountsManagement.js',
    'JournalEntryManagement.js',
    'GeneralLedgerManagement.js',
    'AccountReconManagement.js',
    'FinancialStatementsManagement.js',
    'FixedAssetManagement.js',
    'FixedAssetsManagement.js',
    'AccountingReports.js'
  ],
  Banking: [
    'BankingDashboard.js',
    'ConnectBank.js',
    'ConnectBankManagement.js',
    'BankTransactionPage.js',
    'BankReconciliation.js',
    'SmartBankReconciliation.js',
    'BankReport.js',
    'BankingTools.js'
  ],
  HR: [
    'HRDashboard.js',
    'EmployeeManagement.js',
    'TimesheetManagement.js',
    'timesheet/MyTimesheet.js',
    'timesheet/TimesheetAdmin.js',
    'timesheet/TimesheetSettings.js',
    'PayManagement.js',
    'PayrollManagement.js',
    'PayrollDashboard.js',
    'pay/MyPay.js',
    'pay/PayAdmin.js',
    'pay/PaySettings.js',
    'BenefitsManagement.js',
    'benefits/BenefitsPage.js',
    'benefits/BenefitsAdmin.js',
    'benefits/MyBenefits.js',
    'benefits/BenefitsSettings.js',
    'HRReportManagement.js',
    'PerformanceManagement.js'
  ]
};

const formsPath = path.join(__dirname, '../src/app/dashboard/components/forms');

// Check if StandardSpinner is imported
function hasStandardSpinnerImport(content) {
  return content.includes("from '@/components/ui/StandardSpinner'");
}

// Add StandardSpinner import if missing
function addStandardSpinnerImport(content) {
  if (hasStandardSpinnerImport(content)) {
    return content;
  }
  
  // Find the last import statement
  const importRegex = /^import .* from ['"].*['"];?$/gm;
  let lastImportIndex = -1;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    lastImportIndex = match.index + match[0].length;
  }
  
  if (lastImportIndex !== -1) {
    const before = content.substring(0, lastImportIndex);
    const after = content.substring(lastImportIndex);
    return before + "\nimport { CenteredSpinner } from '@/components/ui/StandardSpinner';" + after;
  }
  
  return content;
}

// Replace custom spinners with StandardSpinner
function replaceCustomSpinners(content) {
  let updatedContent = content;
  let replacementCount = 0;
  
  // Pattern 1: Full loading div with animate-spin
  const pattern1 = /<div className="flex justify-center items-center h-\d+">\s*<div className="text-center">\s*<div className="(?:inline-block )?animate-spin[^"]*"[^>]*><\/div>\s*<p[^>]*>([^<]*)<\/p>\s*<\/div>\s*<\/div>/gs;
  updatedContent = updatedContent.replace(pattern1, (match, loadingText) => {
    replacementCount++;
    return `<CenteredSpinner size="medium" text="${loadingText}" />`;
  });
  
  // Pattern 2: Loading state with animate-spin
  const pattern2 = /\{loading\s*\?\s*\(\s*<div[^>]*>\s*<div[^>]*animate-spin[^>]*><\/div>\s*(?:<p[^>]*>([^<]*)<\/p>)?\s*<\/div>\s*\)/gs;
  updatedContent = updatedContent.replace(pattern2, (match, loadingText) => {
    replacementCount++;
    return `{loading ? (\n        <CenteredSpinner size="medium"${loadingText ? ` text="${loadingText}"` : ''} />`;
  });
  
  // Pattern 3: Simple animate-spin div
  const pattern3 = /<div className="[^"]*animate-spin[^"]*"[^>]*><\/div>/g;
  updatedContent = updatedContent.replace(pattern3, (match) => {
    // Skip if it's part of a Spinner component definition
    if (match.includes('svg') || match.includes('viewBox')) {
      return match;
    }
    replacementCount++;
    return '<CenteredSpinner size="medium" />';
  });
  
  // Pattern 4: Inline spinners in buttons
  const pattern4 = /<span className="[^"]*animate-spin[^"]*"[^>]*><\/span>/g;
  updatedContent = updatedContent.replace(pattern4, (match) => {
    replacementCount++;
    return '<ButtonSpinner />';
  });
  
  // Pattern 5: SVG spinners in buttons
  const pattern5 = /<svg className="[^"]*animate-spin[^"]*"[^>]*>[\s\S]*?<\/svg>/g;
  updatedContent = updatedContent.replace(pattern5, (match) => {
    // Only replace if it's within a button context
    if (match.includes('text-white') || match.includes('mr-2') || match.includes('ml-1')) {
      replacementCount++;
      return '<ButtonSpinner />';
    }
    return match;
  });
  
  // If we replaced inline spinners, ensure ButtonSpinner is imported
  if (replacementCount > 0 && updatedContent.includes('<ButtonSpinner')) {
    if (updatedContent.includes("import { CenteredSpinner } from '@/components/ui/StandardSpinner';")) {
      updatedContent = updatedContent.replace(
        "import { CenteredSpinner } from '@/components/ui/StandardSpinner';",
        "import { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';"
      );
    }
  }
  
  return { content: updatedContent, count: replacementCount };
}

// Process each component group
Object.entries(componentGroups).forEach(([menuName, components]) => {
  console.log(`\n=== Processing ${menuName} Menu Components ===`);
  let groupUpdated = 0;
  let groupReplacements = 0;
  
  components.forEach(component => {
    const filePath = path.join(formsPath, component);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${component} not found, skipping...`);
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add import if needed
      content = addStandardSpinnerImport(content);
      
      // Replace custom spinners
      const { content: updatedContent, count } = replaceCustomSpinners(content);
      
      if (count > 0) {
        fs.writeFileSync(filePath, updatedContent);
        console.log(`✅ ${component}: Replaced ${count} custom spinner(s)`);
        groupUpdated++;
        groupReplacements += count;
      } else {
        console.log(`ℹ️  ${component}: No custom spinners found`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${component}:`, error.message);
    }
  });
  
  console.log(`${menuName} summary: Updated ${groupUpdated} files with ${groupReplacements} replacements`);
});

console.log(`\n✨ All menus updated successfully!`);