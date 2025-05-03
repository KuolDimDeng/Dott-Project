/**
 * Version0001_fix_tax_management_renderer_fixed.js
 * 
 * Purpose: Fix the Tax Management component rendering when selecting "Taxes" from the HR menu
 * Issue: Currently when selecting "Taxes" from the HR menu, it sets showTaxManagement to true
 *        but the component isn't rendering properly in the content area
 * 
 * This script modifies the RenderMainContent.js file to properly render the TaxManagement component
 * when the showTaxManagement flag is set to true
 * 
 * Author: Admin
 * Date: 2023-05-20
 * Version: 1.1
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const renderMainContentPath = join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');
const backupDir = join(__dirname, '../frontend_file_backups');

// Ensure backup directory exists
if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
}

// Create a backup of the file
function createBackup(filePath) {
    const fileName = basename(filePath);
    const backupPath = join(backupDir, `${fileName}.backup-${new Date().toISOString().replace(/:/g, '-')}`);
    
    try {
        // Copy the file to the backup location
        copyFileSync(filePath, backupPath);
        console.log(`Created backup at: ${backupPath}`);
        return true;
    } catch (error) {
        console.error(`Failed to create backup for ${filePath}:`, error);
        return false;
    }
}

// Fix the RenderMainContent file using a more precise approach
function fixRenderMainContent() {
    try {
        // Create backup
        if (!createBackup(renderMainContentPath)) {
            console.error('Aborting due to backup failure');
            return false;
        }

        // Read the file
        let content = readFileSync(renderMainContentPath, 'utf8');

        // First find the line where "showTaxManagement" condition starts
        const lines = content.split('\n');
        let startLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('} else if (showTaxManagement)') || 
                lines[i].trim() === '} else if (showTaxManagement) {') {
                startLineIndex = i;
                break;
            }
        }
        
        if (startLineIndex === -1) {
            console.error('Could not find "showTaxManagement" condition in the file');
            return false;
        }
        
        // Find the end of this component render block
        let endLineIndex = startLineIndex;
        let bracketCount = 0;
        let foundClosingBracket = false;
        
        for (let i = startLineIndex; i < lines.length; i++) {
            const line = lines[i];
            
            // Count opening and closing brackets to find the end of the block
            for (const char of line) {
                if (char === '{') bracketCount++;
                if (char === '}') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        endLineIndex = i;
                        foundClosingBracket = true;
                        break;
                    }
                }
            }
            
            if (foundClosingBracket) break;
        }
        
        if (!foundClosingBracket) {
            console.error('Could not find the end of "showTaxManagement" component block');
            return false;
        }
        
        // Create the replacement
        const replacementBlock = [
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
        
        // Replace the lines in the original content
        const newLines = [
            ...lines.slice(0, startLineIndex),
            ...replacementBlock,
            ...lines.slice(endLineIndex + 1)
        ];
        
        // Write the updated content back to the file
        writeFileSync(renderMainContentPath, newLines.join('\n'), 'utf8');
        
        console.log('Successfully fixed the RenderMainContent.js file!');
        return true;
    } catch (error) {
        console.error('Error fixing RenderMainContent.js:', error);
        return false;
    }
}

// Main execution
try {
    console.log('Starting tax management rendering fix...');
    
    // Fix the RenderMainContent.js file
    if (fixRenderMainContent()) {
        console.log('Tax management rendering fix completed successfully!');
        console.log('Now when selecting "Taxes" from the HR menu, the TaxManagement component will render properly in the content area.');
    } else {
        console.error('Failed to apply tax management rendering fix.');
    }
} catch (error) {
    console.error('Unexpected error:', error);
} 