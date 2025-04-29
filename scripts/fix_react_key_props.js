#!/usr/bin/env node

/**
 * fix_react_key_props.js
 * 
 * Script to fix React key props spreading issue in the EmployeeManagement component.
 * 
 * Version: 1.0
 * Date: 2023-10-20
 * Author: AI Assistant
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const targetFilePath = path.resolve(
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js'
);

// Check if file exists
if (!fs.existsSync(targetFilePath)) {
  console.error(`Error: Target file not found at ${targetFilePath}`);
  process.exit(1);
}

// Read the file
let fileContent = fs.readFileSync(targetFilePath, 'utf8');

// Fix for table headers
const headerPattern = /<th\s+\{\.\.\.column\.getHeaderProps\(column\.getSortByToggleProps\(\)\)\}\s+className="/g;
const headerReplacement = '<th\n                          key={column.id}\n                          {...((() => {\n                            const props = column.getHeaderProps(column.getSortByToggleProps());\n                            const { key, ...rest } = props;\n                            return rest;\n                          })())}\n                          className="';

// Fix the table rows
const rowPattern = /<tr\s+\{\.\.\.row\.getRowProps\(\)\}\s+className="/g;
const rowReplacement = '<tr\n                      key={row.id || i}\n                      {...((() => {\n                        const props = row.getRowProps();\n                        const { key, ...rest } = props;\n                        return rest;\n                      })())}\n                      className="';

// Update the content
let updatedContent = fileContent.replace(headerPattern, headerReplacement);
updatedContent = updatedContent.replace(rowPattern, rowReplacement);

// Write the updated content back to the file
try {
  fs.writeFileSync(targetFilePath, updatedContent);
  console.log('Successfully fixed React key props spreading issue in EmployeeManagement.js');
} catch (error) {
  console.error('Error writing to file:', error);
  process.exit(1);
}

// Update script registry
const registryPath = path.resolve('/Users/kuoldeng/projectx/scripts/script_registry.json');
let registry = {};

if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (error) {
    console.error('Error reading registry file:', error);
  }
}

registry['fix_react_key_props'] = {
  description: 'Fixes React key props spreading issue in EmployeeManagement.js',
  executed: new Date().toISOString(),
  status: 'completed',
  file_modified: targetFilePath
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log('Updated script registry');
