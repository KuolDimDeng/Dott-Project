#!/usr/bin/env node

/**
 * Properly fix payment components that have the async tenant ID issue
 */

const fs = require('fs');
const path = require('path');

const paymentComponentsDir = path.join(__dirname, '../src/app/dashboard/components/forms');

console.log('=== Fixing Payment Components Properly ===\n');

const filesToFix = [
  'PaymentPlans.js',
  'PaymentGateways.js',
  'PaymentMethods.js',
  'PaymentsDashboard.js',
  'ReceivePayments.js',
  'MakePayments.js',
  'RecurringPayments.js',
  'RefundsManagement.js',
  'PaymentReconciliation.js',
  'PaymentReports.js'
];

filesToFix.forEach(file => {
  const filePath = path.join(paymentComponentsDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found, skipping...`);
    return;
  }
  
  console.log(`\n📄 Fixing ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the FieldTooltip component that got tenant ID check inserted incorrectly
  if (content.includes('const FieldTooltip = ({ text }) => {')) {
    content = content.replace(
      /const FieldTooltip = \({ text }\) => \{[\s\S]*?return \(/,
      `const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (`
    );
    
    // Remove the misplaced tenant ID check from FieldTooltip
    content = content.replace(
      /\/\/ Wait for tenant ID to load\s*\n\s*if \(!tenantId\) \{[\s\S]*?\}\s*\n\s*\n\s*return \(/gm,
      'return ('
    );
  }
  
  // Find the main component
  const componentMatch = content.match(/(const|function)\s+(\w+)\s*=\s*\(\s*\)\s*=>\s*\{/);
  if (!componentMatch) {
    console.log('  ⚠️  Could not find main component, skipping...');
    return;
  }
  
  const componentName = componentMatch[2];
  console.log(`  Found component: ${componentName}`);
  
  // Check if we already have the proper tenant ID setup
  if (content.includes('const [tenantId, setTenantId] = useState(null);')) {
    console.log('  ✅ Already has proper tenant ID setup');
    
    // Just need to add the loading check if missing
    if (!content.includes('// Wait for tenant ID to load')) {
      // Find where to insert the loading check (after all hooks)
      const hooksPattern = /useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g;
      let lastHookMatch;
      let match;
      while ((match = hooksPattern.exec(content)) !== null) {
        lastHookMatch = match;
      }
      
      if (lastHookMatch) {
        const insertPos = lastHookMatch.index + lastHookMatch[0].length;
        const beforeHooks = content.substring(0, insertPos);
        const afterHooks = content.substring(insertPos);
        
        content = beforeHooks + `
  
  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }` + afterHooks;
        
        console.log('  ✅ Added loading check');
      }
    }
  } else {
    console.log('  ❌ Missing proper tenant ID setup, fixing...');
    
    // Replace the incorrect sync usage
    content = content.replace(
      /const tenantId = getSecureTenantId\(\);/,
      `const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);`
    );
    
    // Add loading check after all hooks
    const hooksPattern = /useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g;
    let lastHookMatch;
    let match;
    while ((match = hooksPattern.exec(content)) !== null) {
      lastHookMatch = match;
    }
    
    if (lastHookMatch) {
      const insertPos = lastHookMatch.index + lastHookMatch[0].length;
      const beforeHooks = content.substring(0, insertPos);
      const afterHooks = content.substring(insertPos);
      
      content = beforeHooks + `
  
  // Wait for tenant ID to load
  if (!tenantId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }` + afterHooks;
    }
    
    console.log('  ✅ Fixed tenant ID usage and added loading check');
  }
  
  // Clean up any "No newline at end of file" comments
  content = content.replace(/ No newline at end of file/g, '');
  
  // Ensure file ends with newline
  if (!content.endsWith('\n')) {
    content += '\n';
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('  ✅ File saved');
});

console.log('\n✅ All payment components fixed!\n');