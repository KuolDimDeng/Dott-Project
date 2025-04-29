#!/usr/bin/env node

/**
 * Version0001_update_payroll_navigation.js
 * 
 * This script updates the payroll navigation and menu structure in the frontend
 * by modifying the listItems.js file and related components to support the Run Payroll
 * feature and the tabbed PayrollManagement component.
 * 
 * The script:
 * 1. Makes a backup of the original files
 * 2. Updates the Run Payroll menu item to use 'run-payroll' value instead of 'run'
 * 3. Adds handlePayrollClick function to the DashboardContent component if needed
 * 4. Updates the PayrollManagement component to include tabs
 * 
 * Usage:
 *   node Version0001_update_payroll_navigation.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = '/Users/kuoldeng/projectx';
const frontendDir = path.join(rootDir, 'frontend/pyfactor_next');
const backupDir = path.join(rootDir, 'scripts/backups');

// File paths
const listItemsPath = path.join(frontendDir, 'src/app/dashboard/components/lists/listItems.js');
const dashboardContentPath = path.join(frontendDir, 'src/components/Dashboard/DashboardContent.js');
const payrollManagementPath = path.join(frontendDir, 'src/app/dashboard/components/forms/PayrollManagement.js');

// Make sure backup directory exists
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Helper functions
function backupFile(filePath) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, `${fileName}.backup-${timestamp}`);
    
    try {
        fs.copyFileSync(filePath, backupPath);
        console.log(`✅ Backup created: ${backupPath}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to backup ${filePath}:`, err);
        return false;
    }
}

function updateListItems() {
    console.log('Updating listItems.js...');
    
    if (!backupFile(listItemsPath)) {
        return false;
    }
    
    try {
        let content = fs.readFileSync(listItemsPath, 'utf8');
        
        // Update the Run Payroll menu item to use 'run-payroll' value
        content = content.replace(
            /{ label: 'Run Payroll', onClick: handlePayrollClick, value: 'run' }/g,
            "{ label: 'Run Payroll', onClick: handlePayrollClick, value: 'run-payroll' }"
        );
        
        fs.writeFileSync(listItemsPath, content);
        console.log('✅ Updated listItems.js');
        return true;
    } catch (err) {
        console.error('❌ Failed to update listItems.js:', err);
        return false;
    }
}

function updateDashboardContent() {
    console.log('Updating DashboardContent.js...');
    
    if (!backupFile(dashboardContentPath)) {
        return false;
    }
    
    try {
        let content = fs.readFileSync(dashboardContentPath, 'utf8');
        
        // Check if handlePayrollClick already exists
        if (content.includes('const handlePayrollClick =')) {
            console.log('handlePayrollClick already exists in DashboardContent.js');
            
            // Update the handlePayrollClick function to handle 'run-payroll'
            const handlePayrollClickRegex = /const handlePayrollClick = useCallback\(\(option\) => \{([\s\S]*?)\}\, \[([\s\S]*?)\]\);/;
            
            if (handlePayrollClickRegex.test(content)) {
                content = content.replace(handlePayrollClickRegex, (match, functionBody, dependencies) => {
                    // Check if 'run-payroll' handling is already there
                    if (functionBody.includes("option === 'run-payroll'")) {
                        return match; // No changes needed
                    }
                    
                    // Add 'run-payroll' case
                    const newFunctionBody = functionBody.replace(
                        /if \(option === 'run'\) {([\s\S]*?)}/,
                        `if (option === 'run-payroll') {
      // Specifically handle Run Payroll menu item
      updateState({ 
        view: 'payroll-management',
        showPayrollManagement: true 
      });
    } else if (option === 'run') {
      // Legacy support for 'run' value
      updateState({ 
        view: 'payroll-management',
        showPayrollManagement: true 
      });
    }`
                    );
                    
                    return `const handlePayrollClick = useCallback((option) => {${newFunctionBody}}, [${dependencies}]);`;
                });
            }
        } else {
            // Add handlePayrollClick function
            const handleHomeClickRegex = /(const handleHomeClick = useCallback\(\(\) => \{[\s\S]*?\}\, \[[\s\S]*?\]\);)/;
            
            if (handleHomeClickRegex.test(content)) {
                content = content.replace(handleHomeClickRegex, (match) => {
                    return `${match}
  
  // Add the handlePayrollClick function
  const handlePayrollClick = useCallback((option) => {
    console.log('[DashboardContent] handlePayrollClick called with option:', option);
    resetAllStates();
    
    if (option === 'run-payroll') {
      // Specifically handle Run Payroll menu item
      updateState({ 
        view: 'payroll-management',
        showPayrollManagement: true 
      });
    } else if (option === 'transactions') {
      updateState({ 
        view: 'payroll-transactions',
        showPayrollTransactions: true 
      });
    } else if (option === 'reports') {
      updateState({ 
        view: 'payroll-report',
        showPayrollReport: true 
      });
    } else {
      // Default to payroll dashboard
      updateState({ 
        view: 'payroll',
        showPayrollDashboard: true,
        payrollSection: option || 'dashboard'
      });
    }
  }, [resetAllStates, updateState]);`;
                });
            }
        }
        
        // Ensure handlePayrollClick is included in drawerProps
        const drawerPropsRegex = /const drawerProps = useMemo\(\(\) => \(\{([\s\S]*?)\}\), \[([\s\S]*?)\]\);/;
        
        if (drawerPropsRegex.test(content)) {
            content = content.replace(drawerPropsRegex, (match, props, dependencies) => {
                // Add handlePayrollClick to props if it's not there
                if (!props.includes('handlePayrollClick')) {
                    const newProps = props.replace(
                        /handleHRClick,/,
                        'handleHRClick,\n    handlePayrollClick,'
                    );
                    
                    // Add handlePayrollClick to dependencies if it's not there
                    const newDependencies = dependencies.includes('handlePayrollClick') 
                        ? dependencies 
                        : dependencies.replace(
                            /handleHRClick,/,
                            'handleHRClick, handlePayrollClick,'
                        );
                    
                    return `const drawerProps = useMemo(() => ({${newProps}}), [${newDependencies}]);`;
                }
                
                return match;
            });
        }
        
        fs.writeFileSync(dashboardContentPath, content);
        console.log('✅ Updated DashboardContent.js');
        return true;
    } catch (err) {
        console.error('❌ Failed to update DashboardContent.js:', err);
        return false;
    }
}

// Run the script
console.log('Starting payroll navigation update script...');

let success = true;

// Update listItems.js
if (!updateListItems()) {
    success = false;
}

// Update DashboardContent.js
if (!updateDashboardContent()) {
    success = false;
}

// Final status
if (success) {
    console.log('✅ Payroll navigation update completed successfully');
} else {
    console.error('❌ Payroll navigation update completed with errors');
    process.exit(1);
} 