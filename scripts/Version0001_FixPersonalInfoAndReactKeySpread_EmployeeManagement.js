/**
 * Version0001_FixPersonalInfoAndReactKeySpread_EmployeeManagement.js
 * 
 * Script to fix two issues in the EmployeeManagement component:
 * 1. React key spread errors in table rendering
 * 2. Personal information tab not displaying user data
 * 
 * @version 1.0
 * @date 2025-04-26
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the target file
const targetFilePath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'components', 'forms', 'EmployeeManagement.js');
const backupFolderPath = path.join(__dirname, 'backups');

// Ensure the backup directory exists
if (!fs.existsSync(backupFolderPath)) {
  fs.mkdirSync(backupFolderPath, { recursive: true });
}

// Backup the original file
const timestamp = new Date().toISOString().replace(/:/g, '-');
const backupFilePath = path.join(backupFolderPath, `EmployeeManagement.js.backup-${timestamp}`);

try {
  // Read the original file
  const originalContent = fs.readFileSync(targetFilePath, 'utf8');
  
  // Create backup
  fs.writeFileSync(backupFilePath, originalContent);
  console.log(`Backup created at: ${backupFilePath}`);
  
  // 1. Fix React key spread issues
  let fixedContent = originalContent.replace(
    /const \{ key: tableKey, \.\.\.tableProps \} = getTableProps\(\);[\s\S]*?return \(\s*<table key=\{tableKey\} \{\.\.\.tableProps\}/g,
    'return (\n            <table {...getTableProps()}'
  );
  
  fixedContent = fixedContent.replace(
    /const \{ key: headerGroupKey, \.\.\.headerGroupProps \} = headerGroup\.getHeaderGroupProps\(\);[\s\S]*?return \(\s*<tr key=\{headerGroupKey\} \{\.\.\.headerGroupProps\}/g,
    'return (\n                    <tr {...headerGroup.getHeaderGroupProps()}'
  );
  
  fixedContent = fixedContent.replace(
    /const \{ key, \.\.\.columnProps \} = column\.getHeaderProps\(column\.getSortByToggleProps\(\)\);[\s\S]*?return \(\s*<th\s*key=\{key\}\s*\{\.\.\.columnProps\}/g,
    'return (\n                          <th {...column.getHeaderProps(column.getSortByToggleProps())}'
  );
  
  fixedContent = fixedContent.replace(
    /const \{ key: tbodyKey, \.\.\.tbodyProps \} = getTableBodyProps\(\);[\s\S]*?return \(\s*<tbody key=\{tbodyKey\} \{\.\.\.tbodyProps\}/g,
    'return (\n                  <tbody {...getTableBodyProps()}'
  );
  
  fixedContent = fixedContent.replace(
    /const \{ key: rowKey, \.\.\.rowProps \} = row\.getRowProps\(\);[\s\S]*?return \(\s*<tr\s*key=\{rowKey\}\s*\{\.\.\.rowProps\}/g,
    'return (\n                        <tr key={`row-${row.id}`} {...row.getRowProps()}'
  );
  
  fixedContent = fixedContent.replace(
    /const \{ key: cellKey, \.\.\.cellProps \} = cell\.getCellProps\(\);[\s\S]*?return \(\s*<td\s*key=\{cellKey\}\s*\{\.\.\.cellProps\}/g,
    'return (\n                              <td key={`cell-${row.id}-${cell.column.id}`} {...cell.getCellProps()}'
  );
  
  // 2. Fix personal information tab display by improving the fetchCurrentUser function
  fixedContent = fixedContent.replace(
    /const fetchCurrentUser = async \(\) => {[\s\S]*?try {[\s\S]*?const user = await getCurrentUser\(\);[\s\S]*?if \(user\) {[\s\S]*?setCurrentUser\(user\);[\s\S]*?\/\/ Check if user is an owner[\s\S]*?const profile = await getUserProfile\(\);/,
    `const fetchCurrentUser = async () => {
      try {
        logger.debug('[EmployeeManagement] Fetching current user and profile...');
        
        // Get user attributes from Cognito
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          logger.debug('[EmployeeManagement] Current user set:', user);
          
          // Get tenant ID from URL or app cache
          const tenantId = await getSecureTenantId();
          logger.debug('[EmployeeManagement] Using tenant ID for profile:', tenantId);
          
          // Check if user is an owner
          const profile = await getUserProfile(tenantId);
          logger.debug('[EmployeeManagement] User profile retrieved:', profile);`
  );
  
  // Add debug logging to help troubleshoot
  fixedContent = fixedContent.replace(
    /\/\/ If user is owner, set their information as the selected employee/,
    `// If user is owner, set their information as the selected employee
          logger.debug('[EmployeeManagement] Checking if user is owner:', { 
            role: profile?.role,
            userRole: profile?.userRole,
            isOwnerCheck: profile?.role === 'owner' || profile?.userRole === 'owner'
          });`
  );
  
  // Write the fixed content back to the file
  fs.writeFileSync(targetFilePath, fixedContent);
  console.log(`Fixed content written to: ${targetFilePath}`);
  
  console.log("Fixes applied successfully:");
  console.log("1. Fixed React key spread issues in table rendering");
  console.log("2. Enhanced personal information tab data retrieval and added debug logging");
  
} catch (error) {
  console.error('Error:', error);
} 