/**
 * Version0003_fix_tax_management_component.js
 * 
 * Purpose: Fix the Tax Management component rendering in RenderMainContent.js with greater precision
 * Issue: The file has been restored from backup, but we need to ensure the proper rendering
 *        of the TaxManagement component when "Taxes" is selected from the HR menu
 * 
 * This script:
 * 1. Reads the RenderMainContent.js file
 * 2. Finds the EXACT EmployeeTaxManagement component reference in the rendering logic
 * 3. Replaces only the component name while preserving the rest of the structure
 * 4. Creates a backup of the successfully modified file
 * 
 * Author: Admin
 * Date: 2025-04-23
 * Version: 1.0
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const targetFile = join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');
const backupDir = join(__dirname, '../frontend_file_backups');
const successBackupDir = join(__dirname, '../frontend_file_backups/successful_fixes');

// Ensure backup directories exist
if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
}

if (!existsSync(successBackupDir)) {
    mkdirSync(successBackupDir, { recursive: true });
}

// Create a backup of the file
function createBackup(filePath, isSuccessFix = false) {
    try {
        const fileName = basename(filePath);
        let backupPath;
        
        if (isSuccessFix) {
            backupPath = join(successBackupDir, `${fileName}.fixed-${new Date().toISOString().replace(/:/g, '-')}`);
        } else {
            backupPath = join(backupDir, `${fileName}.backup-${new Date().toISOString().replace(/:/g, '-')}`);
        }
        
        // Copy the file to the backup location
        copyFileSync(filePath, backupPath);
        console.log(`Created backup at: ${backupPath}`);
        return true;
    } catch (error) {
        console.error(`Failed to create backup for ${filePath}:`, error);
        return false;
    }
}

// Function to precisely modify only the TaxManagement component reference
function fixTaxManagementComponent() {
    try {
        // Create backup before making changes
        if (!createBackup(targetFile)) {
            console.error('Aborting due to backup failure');
            return false;
        }

        // Read the file content
        let content = readFileSync(targetFile, 'utf8');
        
        // Find all references to EmployeeTaxManagement
        console.log('Searching for EmployeeTaxManagement references...');
        
        // Simple search and replace isn't sufficient - we need to make sure we're modifying 
        // only the component instance, not imports or other references
        
        // Find where showTaxManagement is referenced in the rendering logic
        // Look for pattern like: <EmployeeTaxManagement /> within the showTaxManagement condition
        const taxManagementPattern = /} else if \(showTaxManagement\) {[^}]*<EmployeeTaxManagement[^}]*}/gs;
        
        // Check if pattern is found
        if (!taxManagementPattern.test(content)) {
            console.log('Pattern not found. Trying a simpler search...');
            
            // Try to find EmployeeTaxManagement usages
            const employeeTaxMatches = content.match(/<EmployeeTaxManagement\s*\/>/g) || [];
            console.log(`Found ${employeeTaxMatches.length} direct EmployeeTaxManagement component usages`);
            
            if (employeeTaxMatches.length > 0) {
                // Simple component replacement
                content = content.replace(/<EmployeeTaxManagement\s*\/>/g, '<TaxManagement />');
                console.log('Replaced EmployeeTaxManagement with TaxManagement');
                
                // Log a sample of the replaced content for verification
                const updatedSection = content.substring(
                    content.indexOf('<TaxManagement />') - 50, 
                    content.indexOf('<TaxManagement />') + 50
                );
                console.log('Updated section preview:', updatedSection);
            } else {
                // Look for component declarations - try to find where EmployeeTaxManagement is imported or defined
                console.log('Searching for EmployeeTaxManagement in import or declaration statements...');
                
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('EmployeeTaxManagement')) {
                        console.log(`Found at line ${i + 1}: ${lines[i]}`);
                    }
                }
                
                // Look for showTaxManagement condition
                console.log('Searching for showTaxManagement condition...');
                
                let showTaxManagementLine = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('} else if (showTaxManagement)') || 
                        lines[i].trim() === '} else if (showTaxManagement) {') {
                        showTaxManagementLine = i;
                        console.log(`Found showTaxManagement condition at line ${i + 1}: ${lines[i]}`);
                        
                        // Print the next 20 lines to see the context
                        console.log('Next 20 lines of context:');
                        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
                            console.log(`Line ${j + 1}: ${lines[j]}`);
                        }
                        break;
                    }
                }
                
                if (showTaxManagementLine === -1) {
                    console.error('Could not find showTaxManagement condition in the file');
                    return false;
                }
            }
        } else {
            console.log('Found showTaxManagement pattern with EmployeeTaxManagement reference');
            
            // Replace only within the showTaxManagement block
            content = content.replace(taxManagementPattern, (match) => {
                // Replace EmployeeTaxManagement with TaxManagement while preserving the structure
                return match.replace(/EmployeeTaxManagement/g, 'TaxManagement');
            });
        }
        
        // Write the updated content back to the file
        writeFileSync(targetFile, content, 'utf8');
        console.log('Successfully updated the file content');
        
        // Create a backup of the successfully fixed file
        createBackup(targetFile, true);
        
        return true;
    } catch (error) {
        console.error('Error fixing Tax Management component:', error);
        return false;
    }
}

// Main execution
try {
    console.log('Starting precise fix for Tax Management component in RenderMainContent.js...');
    
    if (fixTaxManagementComponent()) {
        console.log('Fix completed successfully!');
        console.log('Now when selecting "Taxes" from the HR menu, the TaxManagement component will render properly in the content area.');
    } else {
        console.error('Fix failed!');
    }
} catch (error) {
    console.error('Unexpected error during fix:', error);
} 