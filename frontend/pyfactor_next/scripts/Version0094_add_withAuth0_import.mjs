/**
 * Version: 0094
 * Date: 2025-06-06
 * Description: Adds withAuth0 import to Auth0 route file
 * Purpose: Implements Auth0 edge middleware for improved performance
 * Execution Status: Not Executed
 * 
 * Usage:
 * 1. Run this script using Node.js
 * 2. Verifies and applies the required changes to route.js
 * 3. Creates backup before making changes
 */

import fs from 'fs';
import path from 'path';

// Define file paths
const filePath = path.join(__dirname, '../../src/app/api/auth/[...auth0]/route.js');
const backupPath = path.join(__dirname, `../../src/app/api/auth/[...auth0]/route.js.backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`);

// Create backup function
function createBackup() {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(backupPath, originalContent);
    console.log(`Backup created at ${backupPath}`);
}

// Apply changes function
function applyChanges() {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if import already exists
    if (!content.includes('withAuth0')) {
        // Add import statement
        content = `import { withAuth0 } from '@auth0/nextjs-auth0/edge';\n${content}`;
        
        // Save changes
        fs.writeFileSync(filePath, content);
        console.log('withAuth0 import added successfully');
    } else {
        console.log('withAuth0 import already exists');
    }
}

// Main execution
try {
    console.log('Starting script execution...');
    createBackup();
    applyChanges();
    console.log('Script completed successfully');
} catch (error) {
    console.error('Error executing script:', error);
}
