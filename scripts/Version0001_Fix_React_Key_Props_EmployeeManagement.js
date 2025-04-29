#!/usr/bin/env node

/**
 * Version0001_Fix_React_Key_Props_EmployeeManagement.js
 * 
 * Script to fix React key props spreading issue in the EmployeeManagement component.
 * 
 * The issue: React warns about a key prop being spread via JSX instead of being passed directly.
 * Location: src/app/dashboard/components/forms/EmployeeManagement.js (around line 1600)
 * 
 * This script modifies the way table headers are rendered to correctly handle the key prop.
 * 
 * Version: 1.0
 * Date: 2023-10-20
 * Author: AI Assistant
 */

const fs = require('fs');
const path = require('path');

// File paths
const targetFilePath = path.resolve(
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js'
);
const backupFilePath = path.resolve(
  '/Users/kuoldeng/projectx/scripts/backups',
  `EmployeeManagement.js.backup.${new Date().toISOString().split('T')[0].replace(/-/g, '')}`
);

// Check if file exists
if (!fs.existsSync(targetFilePath)) {
  console.error(`Error: Target file not found at ${targetFilePath}`);
  process.exit(1);
}

// Read the file
let fileContent = fs.readFileSync(targetFilePath, 'utf8');

// Create backup if needed
if (!fs.existsSync(backupFilePath)) {
  console.log(`Creating backup at ${backupFilePath}`);
  fs.writeFileSync(backupFilePath, fileContent);
}

// Define the problematic code pattern and its replacement
const problematicPattern = /<th\s+\{\.\.\.column\.getHeaderProps\(column\.getSortByToggleProps\(\)\)\}\s+className="[^"]*"\s*>/g;

const replacement = `<th
                        key={column.id}
                        {...(column.getHeaderProps ? column.getHeaderProps(column.getSortByToggleProps()) : {})}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >`;

// Replace the problematic code
const updatedContent = fileContent.replace(problematicPattern, replacement);

// Check if any changes were made
if (fileContent === updatedContent) {
  console.log('No changes needed. The file does not contain the problematic pattern or has already been fixed.');
  process.exit(0);
}

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

registry['Version0001_Fix_React_Key_Props_EmployeeManagement'] = {
  description: 'Fixes React key props spreading issue in EmployeeManagement.js',
  executed: new Date().toISOString(),
  status: 'completed',
  file_modified: targetFilePath
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log('Updated script registry'); 