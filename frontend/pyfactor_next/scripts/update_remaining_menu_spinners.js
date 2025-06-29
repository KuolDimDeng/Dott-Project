#!/usr/bin/env node

/**
 * Script to update Payroll, Taxes, Reports, Analytics, and Smart Insight components to use StandardSpinner
 * Version: 0001_update_remaining_menu_spinners
 */

const fs = require('fs');
const path = require('path');

// Component groups
const componentGroups = {
  Payroll: [
    'PayrollDashboard.js',
    'PayrollManagement.js',
    'PayrollTransactions.js',
    'PayrollReport.js',
    'PayrollRunSummary.js'
  ],
  Taxes: [
    'TaxesDashboard.js',
    'SalesTaxManagement.js',
    'IncomeTaxManagement.js',
    'PayrollTaxManagement.js',
    'TaxPaymentsManagement.js',
    'TaxFormsManagement.js',
    'TaxReportsManagement.js'
  ],
  Reports: [
    'ReportsDashboard.js',
    'reports/IncomeStatementReport.js',
    'BalanceSheet.js',
    'reports/BalanceSheetReport.js',
    'CashFlow.js',
    'reports/CashFlowReport.js',
    'reports/SalesTaxReport.js',
    'IncomeByCustomer.js',
    'AgedReceivables.js',
    'reports/AgedReceivablesReport.js',
    'AgedPayables.js',
    'AccountBalances.js',
    'TrialBalances.js',
    'GeneralLedgerManagement.js',
    'ProfitAndLoss.js'
  ],
  Analytics: [
    'AnalyticsDashboard.js',
    'AnalysisPage.js',
    'SalesAnalysis.js',
    'ExpenseAnalysis.js',
    'CashFlowAnalysis.js',
    'ProfitabilityAnalysis.js'
  ],
  'Smart Insight': [
    'SmartInsight.js'
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
function replaceCustomSpinners(content, filePath) {
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
  
  // Pattern 6: Specific pattern for report loading states
  const pattern6 = /<div className="text-center py-\d+">\s*<div className="[^"]*animate-spin[^"]*"[^>]*><\/div>\s*<p[^>]*>([^<]*)<\/p>\s*<\/div>/gs;
  updatedContent = updatedContent.replace(pattern6, (match, loadingText) => {
    replacementCount++;
    return `<CenteredSpinner size="medium" text="${loadingText}" />`;
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
let totalFilesUpdated = 0;
let totalReplacements = 0;

Object.entries(componentGroups).forEach(([menuName, components]) => {
  console.log(`\n=== Processing ${menuName} Components ===`);
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
      
      // Skip if already has StandardSpinner and no animate-spin
      if (hasStandardSpinnerImport(content) && !content.includes('animate-spin')) {
        console.log(`✓  ${component}: Already updated`);
        return;
      }
      
      // Add import if needed
      content = addStandardSpinnerImport(content);
      
      // Replace custom spinners
      const { content: updatedContent, count } = replaceCustomSpinners(content, filePath);
      
      if (count > 0) {
        fs.writeFileSync(filePath, updatedContent);
        console.log(`✅ ${component}: Replaced ${count} custom spinner(s)`);
        groupUpdated++;
        groupReplacements += count;
        totalFilesUpdated++;
        totalReplacements += count;
      } else {
        console.log(`ℹ️  ${component}: No custom spinners found`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${component}:`, error.message);
    }
  });
  
  if (groupUpdated > 0) {
    console.log(`${menuName} summary: Updated ${groupUpdated} files with ${groupReplacements} replacements`);
  }
});

console.log(`\n✨ Update complete!`);
console.log(`📊 Total: ${totalFilesUpdated} files updated with ${totalReplacements} spinner replacements`);