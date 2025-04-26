/**
 * Version0002_fix_tax_management_manual.js
 * 
 * Purpose: Manually fix the Tax Management component rendering in RenderMainContent.js
 * Issue: The file was corrupted by a previous script. We restored from backup, but still need
 *        to implement the original fix to make the Tax Management component render properly.
 * 
 * This script:
 * 1. Reads the RenderMainContent.js file
 * 2. Locates the existing showTaxManagement condition
 * 3. Replaces it with the correct implementation to use TaxManagement instead of EmployeeTaxManagement
 * 4. Creates a backup of the fixed file
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

// Function to manually find and replace the tax management component section
function fixTaxManagementComponent() {
    try {
        // Create backup before making changes
        if (!createBackup(targetFile)) {
            console.error('Aborting due to backup failure');
            return false;
        }

        // Read the file content
        let content = readFileSync(targetFile, 'utf8');
        
        // Split into lines for easier manipulation
        const lines = content.split('\n');
        
        // Find the showTaxManagement condition
        let startLineIndex = -1;
        let endLineIndex = -1;
        let inTaxManagementBlock = false;
        let bracketCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for the start of the showTaxManagement condition
            if (line.includes('} else if (showTaxManagement)') || 
                line.trim() === '} else if (showTaxManagement) {') {
                startLineIndex = i;
                inTaxManagementBlock = true;
                bracketCount = 1; // We're already inside one bracket from the condition
                continue;
            }
            
            // If we're in the tax management block, track brackets to find the end
            if (inTaxManagementBlock) {
                // Count opening and closing brackets
                for (const char of line) {
                    if (char === '{') bracketCount++;
                    if (char === '}') {
                        bracketCount--;
                        if (bracketCount === 0) {
                            endLineIndex = i;
                            break;
                        }
                    }
                }
                
                // If we found the end, break out of the loop
                if (endLineIndex !== -1) break;
            }
        }
        
        // If we couldn't find the showTaxManagement block, search for EmployeeTaxManagement references
        if (startLineIndex === -1) {
            console.log('Could not find showTaxManagement block, searching for EmployeeTaxManagement references...');
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('EmployeeTaxManagement')) {
                    console.log(`Found EmployeeTaxManagement reference at line ${i + 1}: ${lines[i]}`);
                }
            }
            
            // Try to find a suitable insertion point
            for (let i = 0; i < lines.length; i++) {
                // Look for a pattern that might indicate the rendering logic section
                if (lines[i].includes('else if (showTimesheetManagement)') ||
                    lines[i].includes('else if (showEmployeeManagement)') ||
                    lines[i].includes('else if (showBenefitsManagement)')) {
                    
                    console.log(`Found potential insertion point at line ${i + 1}: ${lines[i]}`);
                    
                    // Locate the end of this block
                    let blockStart = i;
                    let blockBracketCount = lines[i].includes('{') ? 1 : 0;
                    let j = i + 1;
                    
                    while (j < lines.length && blockBracketCount > 0) {
                        for (const char of lines[j]) {
                            if (char === '{') blockBracketCount++;
                            if (char === '}') blockBracketCount--;
                        }
                        j++;
                    }
                    
                    console.log(`Found end of block at line ${j}: ${lines[j - 1]}`);
                    
                    // This is a good insertion point for our tax management code
                    startLineIndex = j;
                    endLineIndex = j;
                    break;
                }
            }
        }
        
        if (startLineIndex === -1 || endLineIndex === -1) {
            console.error('Could not find or determine appropriate location for tax management code');
            return false;
        }
        
        console.log(`Found showTaxManagement block from lines ${startLineIndex + 1} to ${endLineIndex + 1}`);
        
        // Create the correct tax management component rendering code
        const taxManagementBlock = [
            '} else if (showTaxManagement) {',
            '      console.log(\'[RenderMainContent] showTaxManagement is true, setting ActiveComponent to TaxManagement\');',
            '      ActiveComponent = () => (',
            '        <SuspenseWithCleanup',
            '          componentKey={`tax-management-${navigationKey || \'default\'}`}',
            '          fallback={<LoadingComponent />}',
            '        >',
            '          <ErrorBoundary',
            '            fallbackComponent={ErrorFallbackComponent}',
            '            onError={handleError}',
            '          >',
            '            <TaxManagement />',
            '          </ErrorBoundary>',
            '        </SuspenseWithCleanup>',
            '      );'
        ];
        
        // Replace the lines in the original content if it's a replacement,
        // or insert if it's a new block
        if (endLineIndex > startLineIndex) {
            // Replace existing block
            const modifiedLines = [
                ...lines.slice(0, startLineIndex),
                ...taxManagementBlock,
                ...lines.slice(endLineIndex + 1)
            ];
            
            // Write the updated content back to the file
            writeFileSync(targetFile, modifiedLines.join('\n'), 'utf8');
        } else {
            // Insert new block
            const modifiedLines = [
                ...lines.slice(0, startLineIndex),
                ...taxManagementBlock,
                ...lines.slice(startLineIndex)
            ];
            
            // Write the updated content back to the file
            writeFileSync(targetFile, modifiedLines.join('\n'), 'utf8');
        }
        
        console.log('Successfully updated the Tax Management component in RenderMainContent.js');
        
        // Create a backup of the fixed file
        createBackup(targetFile, true);
        
        return true;
    } catch (error) {
        console.error('Error fixing Tax Management component:', error);
        return false;
    }
}

// Main execution
try {
    console.log('Starting manual fix for Tax Management component in RenderMainContent.js...');
    
    if (fixTaxManagementComponent()) {
        console.log('Fix completed successfully!');
        console.log('Now when selecting "Taxes" from the HR menu, the TaxManagement component will render properly in the content area.');
    } else {
        console.error('Fix failed!');
    }
} catch (error) {
    console.error('Unexpected error during fix:', error);
} 