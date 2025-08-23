#!/usr/bin/env node

/**
 * Script to fix chart imports and registrations across the codebase
 * This updates components to use the centralized chart configuration
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

// Files to update
const filesToUpdate = [
  'app/dashboard/components/forms/SalesAnalysis.js',
  'app/dashboard/components/forms/BalanceSheetAnalysis.js',
  'app/dashboard/components/forms/BudgetVsActualAnalysis.js',
  'app/dashboard/components/forms/ProfitAndLossAnalysis.js',
  'app/dashboard/components/forms/ExpenseAnalysis.js',
];

// Pattern to replace Chart.js registration
const chartJSRegistrationPattern = /import\s*{[\s\S]*?}\s*from\s*['"]chart\.js['"];?\s*ChartJS\.register\([^)]*\);?/gm;

// Pattern to replace react-chartjs-2 imports
const reactChartJS2Pattern = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]react-chartjs-2['"];?/g;

function updateFile(filePath) {
  const fullPath = path.join(srcDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Remove Chart.js registration code
  if (chartJSRegistrationPattern.test(content)) {
    content = content.replace(chartJSRegistrationPattern, '');
    console.log(`✅ Removed Chart.js registration from ${filePath}`);
  }
  
  // Replace react-chartjs-2 imports
  const chartImportMatch = content.match(reactChartJS2Pattern);
  if (chartImportMatch) {
    const chartTypes = chartImportMatch[1].split(',').map(t => t.trim());
    const safeImports = chartTypes.map(type => {
      switch(type) {
        case 'Line': return 'SafeLineChart';
        case 'Bar': return 'SafeBarChart';
        case 'Pie': return 'SafePieChart';
        case 'Doughnut': return 'SafeDoughnutChart';
        default: return type;
      }
    });
    
    const newImport = `import { ${safeImports.join(', ')} } from '@/components/charts/SafeCharts';`;
    content = content.replace(reactChartJS2Pattern, newImport);
    
    // Update component usage
    chartTypes.forEach((type, index) => {
      if (['Line', 'Bar', 'Pie', 'Doughnut'].includes(type)) {
        const safeType = safeImports[index];
        const componentPattern = new RegExp(`<${type}\\s`, 'g');
        content = content.replace(componentPattern, `<${safeType} `);
      }
    });
    
    console.log(`✅ Updated chart imports in ${filePath}`);
  }
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`💾 Saved ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed for ${filePath}`);
  }
}

console.log('🔧 Fixing chart components...\n');

filesToUpdate.forEach(updateFile);

console.log('\n✨ Chart fix complete!');
console.log('\nNext steps:');
console.log('1. Run: npm run build');
console.log('2. Test the application locally');
console.log('3. Commit and deploy the changes');