#!/usr/bin/env node

// CommonJS version for compatibility
const fs = require('fs');
const path = require('path');

// File paths
const targetFilePath = path.join('/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js');
const backupFilePath = path.join('/Users/kuoldeng/projectx/scripts/backups', `EmployeeManagement.js.row_fix.${new Date().toISOString().split('T')[0].replace(/-/g, '')}`);

// Read the file
console.log(`Reading file: ${targetFilePath}`);
const fileContent = fs.readFileSync(targetFilePath, 'utf8');

// Create backup
console.log(`Creating backup: ${backupFilePath}`);
fs.writeFileSync(backupFilePath, fileContent);

// The pattern to find and replace
const pattern = /(\{page\.map\(\(row, i\) => \{\s*prepareRow\(row\)\s*return \(\s*<tr\s*\{\.\.\.row\.getRowProps\(\)\})/g;
const replacement = 
`{page.map((row, i) => {
                  prepareRow(row);
                  // Extract key from row props to fix React key prop warning
                  const rowProps = row.getRowProps();
                  const { key, ...restRowProps } = rowProps;
                  
                  return (
                    <tr 
                      key={key || row.id || i}
                      {...restRowProps}`;

// Replace the pattern
const updatedContent = fileContent.replace(pattern, replacement);

// Write the updated content back to the file
fs.writeFileSync(targetFilePath, updatedContent);
console.log('Successfully updated file to fix row key props issue.');
