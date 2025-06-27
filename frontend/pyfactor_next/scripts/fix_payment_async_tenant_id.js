#!/usr/bin/env node

/**
 * Fix payment components using async getSecureTenantId incorrectly
 * This was causing infinite re-renders
 */

const fs = require('fs');
const path = require('path');

const paymentComponentsDir = path.join(__dirname, '../src/app/dashboard/components/forms');

console.log('=== Fixing Payment Components Async TenantId Issue ===\n');

// Find all payment-related components
const files = fs.readdirSync(paymentComponentsDir)
  .filter(file => file.endsWith('.js') && 
    (file.includes('Payment') || file.includes('Refund') || file.includes('Recurring')));

console.log(`Found ${files.length} payment component files to check`);

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(paymentComponentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if file uses getSecureTenantId incorrectly
  if (content.includes('const tenantId = getSecureTenantId();')) {
    console.log(`\n📄 ${file}:`);
    console.log('  ❌ Found incorrect sync usage of getSecureTenantId');
    
    // First, add useState and useEffect imports if not present
    if (!content.includes('useState') && content.includes('import React')) {
      content = content.replace(
        /import React(.*?)from 'react';/,
        "import React$1, { useState, useEffect } from 'react';"
      );
    } else if (!content.includes('useState') && content.includes("from 'react'")) {
      content = content.replace(
        /import \{([^}]+)\} from 'react';/,
        (match, imports) => {
          const importList = imports.split(',').map(i => i.trim());
          if (!importList.includes('useState')) importList.push('useState');
          if (!importList.includes('useEffect')) importList.push('useEffect');
          return `import { ${importList.join(', ')} } from 'react';`;
        }
      );
    }
    
    // Replace the incorrect usage with proper async handling
    content = content.replace(
      /const tenantId = getSecureTenantId\(\);/g,
      `const [tenantId, setTenantId] = useState(null);
  
  useEffect(() => {
    const fetchTenantId = async () => {
      const id = await getSecureTenantId();
      setTenantId(id);
    };
    fetchTenantId();
  }, []);`
    );
    
    // Update the component to handle null tenantId
    if (!content.includes('if (!tenantId) return')) {
      // Find the component's return statement
      const componentMatch = content.match(/^(const|function)\s+\w+\s*=?\s*\([^)]*\)\s*=>\s*{/m);
      if (componentMatch) {
        const insertPos = content.indexOf('{', componentMatch.index) + 1;
        const beforeReturn = content.substring(0, insertPos);
        const afterReturn = content.substring(insertPos);
        
        // Insert null check after the hooks
        const hooksEndMatch = afterReturn.match(/\n\n|\n\s*const\s+\w+\s*=|\n\s*if\s*\(|\n\s*return/);
        if (hooksEndMatch) {
          const hooksEndPos = hooksEndMatch.index;
          content = beforeReturn + 
            afterReturn.substring(0, hooksEndPos) +
            '\n\n  // Wait for tenant ID to load\n  if (!tenantId) {\n    return (\n      <div className="flex justify-center items-center h-64">\n        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>\n      </div>\n    );\n  }\n' +
            afterReturn.substring(hooksEndPos);
        }
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✅ Fixed to use async pattern with useState/useEffect');
    fixedCount++;
  } else if (content.includes('getSecureTenantId')) {
    console.log(`\n📄 ${file}:`);
    console.log('  ℹ️  Uses getSecureTenantId but may already be fixed or use different pattern');
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log('\nDone!');