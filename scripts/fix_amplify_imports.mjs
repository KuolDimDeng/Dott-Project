#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔧 Fixing AWS Amplify imports for build errors');

// Files mentioned in the build error
const filesToUpdate = [
  'src/app/dashboard/DashboardWrapper.js',
  'src/app/dashboard/components/crm/CRMDashboard.js',
  'src/app/dashboard/components/crm/ContactsManagement.js',
  'src/app/dashboard/components/crm/CustomersManagement.js',
  'src/app/dashboard/crm/activities/page.js'
];

function updateFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Replace aws-amplify/auth imports
    const originalContent = content;
    content = content.replace(
      /import\s*{([^}]+)}\s*from\s*['"]aws-amplify\/auth['"];?/g,
      (match, imports) => {
        return `import { ${imports.trim()} } from '@/config/amplifyUnified';`;
      }
    );
    
    // Replace @aws-amplify/auth imports
    content = content.replace(
      /import\s*{([^}]+)}\s*from\s*['"]@aws-amplify\/auth['"];?/g,
      (match, imports) => {
        return `import { ${imports.trim()} } from '@/config/amplifyUnified';`;
      }
    );
    
    if (content !== originalContent) {
      modified = true;
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log(`\n🔍 Processing ${filesToUpdate.length} files...\n`);
  
  let updatedCount = 0;
  
  for (const file of filesToUpdate) {
    const wasUpdated = updateFile(file);
    if (wasUpdated) {
      updatedCount++;
    }
  }
  
  console.log(`\n📊 Summary: ${updatedCount} files updated`);
  
  if (updatedCount > 0) {
    console.log(`\n🎉 Successfully updated AWS Amplify imports!`);
  }
}

main().catch(console.error); 