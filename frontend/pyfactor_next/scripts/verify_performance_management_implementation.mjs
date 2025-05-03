/**
 * Verification script for Performance Management implementation
 * 
 * This script checks:
 * 1. The Performance menu item exists in listItems.js
 * 2. The handleHRClick function in DashboardContent.js sets showPerformanceManagement when performance is selected
 * 3. showPerformanceManagement is passed as a prop to RenderMainContent
 * 4. RenderMainContent renders the PerformanceManagement component when showPerformanceManagement is true
 * 5. The PerformanceManagement component exists and is properly implemented
 * 
 * Author: System
 * Date: 2025-04-28
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const RENDER_MAIN_CONTENT_PATH = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.js');
const DASHBOARD_CONTENT_PATH = path.join(process.cwd(), 'frontend/pyfactor_next/src/components/Dashboard/DashboardContent.js');
const LIST_ITEMS_PATH = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js');
const PERFORMANCE_MANAGEMENT_PATH = path.join(process.cwd(), 'frontend/pyfactor_next/src/app/dashboard/components/forms/PerformanceManagement.js');

// Color formatting for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Create test report
let testResults = {
  menuItem: { status: 'not tested', details: '' },
  handleHRClick: { status: 'not tested', details: '' },
  propsPassing: { status: 'not tested', details: '' },
  renderCondition: { status: 'not tested', details: '' },
  componentImplementation: { status: 'not tested', details: '' }
};

// Main function
async function main() {
  try {
    console.log(`${colors.cyan}Starting verification of Performance Management implementation...${colors.reset}`);
    
    // 1. Check if Performance menu item exists in listItems.js
    if (fs.existsSync(LIST_ITEMS_PATH)) {
      const listItemsContent = fs.readFileSync(LIST_ITEMS_PATH, 'utf8');
      
      // Check both patterns of menu item implementation
      const performanceMenuItem = 
        (listItemsContent.includes("'Performance'") && listItemsContent.includes("onClick: () => handleHRClick('performance')")) ||
        (listItemsContent.includes("label: 'Performance'") && 
         (listItemsContent.includes("onClick: handleHRClick, value: 'performance'") || 
          listItemsContent.includes("onClick: () => handleHRClick('performance')")));
      
      if (performanceMenuItem) {
        testResults.menuItem.status = 'success';
        testResults.menuItem.details = 'Performance menu item exists in listItems.js';
        console.log(`${colors.green}✅ Performance menu item exists in listItems.js${colors.reset}`);
      } else {
        testResults.menuItem.status = 'failure';
        testResults.menuItem.details = 'Performance menu item is missing in listItems.js';
        console.log(`${colors.red}❌ Performance menu item is missing in listItems.js${colors.reset}`);
      }
    } else {
      testResults.menuItem.status = 'error';
      testResults.menuItem.details = `File not found: ${LIST_ITEMS_PATH}`;
      console.log(`${colors.red}❌ File not found: ${LIST_ITEMS_PATH}${colors.reset}`);
    }
    
    // 2. Check if handleHRClick function in DashboardContent.js sets showPerformanceManagement
    if (fs.existsSync(DASHBOARD_CONTENT_PATH)) {
      const dashboardContentContent = fs.readFileSync(DASHBOARD_CONTENT_PATH, 'utf8');
      const handleHRClickImplementation = dashboardContentContent.includes('showPerformanceManagement: section === \'performance\'');
      
      if (handleHRClickImplementation) {
        testResults.handleHRClick.status = 'success';
        testResults.handleHRClick.details = 'handleHRClick function properly sets showPerformanceManagement';
        console.log(`${colors.green}✅ handleHRClick function properly sets showPerformanceManagement${colors.reset}`);
      } else {
        testResults.handleHRClick.status = 'failure';
        testResults.handleHRClick.details = 'handleHRClick function does not set showPerformanceManagement properly';
        console.log(`${colors.red}❌ handleHRClick function does not set showPerformanceManagement properly${colors.reset}`);
      }
    } else {
      testResults.handleHRClick.status = 'error';
      testResults.handleHRClick.details = `File not found: ${DASHBOARD_CONTENT_PATH}`;
      console.log(`${colors.red}❌ File not found: ${DASHBOARD_CONTENT_PATH}${colors.reset}`);
    }
    
    // 3. Check if showPerformanceManagement is passed as a prop to RenderMainContent
    if (fs.existsSync(DASHBOARD_CONTENT_PATH)) {
      const dashboardContentContent = fs.readFileSync(DASHBOARD_CONTENT_PATH, 'utf8');
      const propsPassingImplementation = dashboardContentContent.includes('showPerformanceManagement: uiState.showPerformanceManagement');
      
      if (propsPassingImplementation) {
        testResults.propsPassing.status = 'success';
        testResults.propsPassing.details = 'showPerformanceManagement is passed as a prop to RenderMainContent';
        console.log(`${colors.green}✅ showPerformanceManagement is passed as a prop to RenderMainContent${colors.reset}`);
      } else {
        testResults.propsPassing.status = 'failure';
        testResults.propsPassing.details = 'showPerformanceManagement is not passed as a prop to RenderMainContent';
        console.log(`${colors.red}❌ showPerformanceManagement is not passed as a prop to RenderMainContent${colors.reset}`);
      }
    }
    
    // 4. Check if RenderMainContent renders the PerformanceManagement component
    if (fs.existsSync(RENDER_MAIN_CONTENT_PATH)) {
      const renderMainContentContent = fs.readFileSync(RENDER_MAIN_CONTENT_PATH, 'utf8');
      const importStatement = renderMainContentContent.includes("import('./forms/PerformanceManagement.js')") || 
                              renderMainContentContent.includes("const PerformanceManagement = enhancedLazy(() => import('./forms/PerformanceManagement.js')");
      const renderCondition = renderMainContentContent.includes('} else if (showPerformanceManagement) {') && 
                              renderMainContentContent.includes('<PerformanceManagement />');
      const propsDeclaration = renderMainContentContent.includes('showPerformanceManagement,');
      
      if (importStatement && renderCondition && propsDeclaration) {
        testResults.renderCondition.status = 'success';
        testResults.renderCondition.details = 'RenderMainContent properly renders the PerformanceManagement component';
        console.log(`${colors.green}✅ RenderMainContent properly renders the PerformanceManagement component${colors.reset}`);
      } else {
        testResults.renderCondition.status = 'failure';
        testResults.renderCondition.details = 'RenderMainContent does not properly render the PerformanceManagement component';
        
        // More detailed information
        let details = [];
        if (!importStatement) details.push('Import statement is missing');
        if (!renderCondition) details.push('Render condition is missing');
        if (!propsDeclaration) details.push('Props declaration is missing');
        
        testResults.renderCondition.details += ` (${details.join(', ')})`;
        console.log(`${colors.red}❌ RenderMainContent does not properly render the PerformanceManagement component${colors.reset}`);
        if (details.length > 0) {
          console.log(`${colors.yellow}   Issues: ${details.join(', ')}${colors.reset}`);
        }
      }
    } else {
      testResults.renderCondition.status = 'error';
      testResults.renderCondition.details = `File not found: ${RENDER_MAIN_CONTENT_PATH}`;
      console.log(`${colors.red}❌ File not found: ${RENDER_MAIN_CONTENT_PATH}${colors.reset}`);
    }
    
    // 5. Check if PerformanceManagement component exists and is properly implemented
    if (fs.existsSync(PERFORMANCE_MANAGEMENT_PATH)) {
      const performanceManagementContent = fs.readFileSync(PERFORMANCE_MANAGEMENT_PATH, 'utf8');
      const hasTabsImplementation = performanceManagementContent.includes('activeTab') && 
                                     performanceManagementContent.includes('setActiveTab');
      const hasEmployeeView = performanceManagementContent.includes('EmployeeView');
      const hasManagerView = performanceManagementContent.includes('ManagerView') || 
                              performanceManagementContent.includes('ManagementView');
      const hasHRAdminView = performanceManagementContent.includes('HRAdminView');
      const hasExecutiveView = performanceManagementContent.includes('ExecutiveView');
      
      if (hasTabsImplementation && hasEmployeeView && hasManagerView && hasHRAdminView && hasExecutiveView) {
        testResults.componentImplementation.status = 'success';
        testResults.componentImplementation.details = 'PerformanceManagement component is properly implemented with all views';
        console.log(`${colors.green}✅ PerformanceManagement component is properly implemented with all views${colors.reset}`);
      } else {
        testResults.componentImplementation.status = 'failure';
        testResults.componentImplementation.details = 'PerformanceManagement component is missing one or more required views';
        
        // More detailed information
        let details = [];
        if (!hasTabsImplementation) details.push('Tabs navigation is missing');
        if (!hasEmployeeView) details.push('Employee view is missing');
        if (!hasManagerView) details.push('Manager view is missing');
        if (!hasHRAdminView) details.push('HR Admin view is missing');
        if (!hasExecutiveView) details.push('Executive view is missing');
        
        testResults.componentImplementation.details += ` (${details.join(', ')})`;
        console.log(`${colors.red}❌ PerformanceManagement component is missing one or more required views${colors.reset}`);
        if (details.length > 0) {
          console.log(`${colors.yellow}   Issues: ${details.join(', ')}${colors.reset}`);
        }
      }
    } else {
      testResults.componentImplementation.status = 'error';
      testResults.componentImplementation.details = `File not found: ${PERFORMANCE_MANAGEMENT_PATH}`;
      console.log(`${colors.red}❌ File not found: ${PERFORMANCE_MANAGEMENT_PATH}${colors.reset}`);
    }
    
    // Print summary
    console.log(`\n${colors.magenta}Performance Management Implementation Verification Summary:${colors.reset}`);
    console.log(`${colors.cyan}1. Menu Item: ${getStatusEmoji(testResults.menuItem.status)} ${testResults.menuItem.details}${colors.reset}`);
    console.log(`${colors.cyan}2. handleHRClick: ${getStatusEmoji(testResults.handleHRClick.status)} ${testResults.handleHRClick.details}${colors.reset}`);
    console.log(`${colors.cyan}3. Props Passing: ${getStatusEmoji(testResults.propsPassing.status)} ${testResults.propsPassing.details}${colors.reset}`);
    console.log(`${colors.cyan}4. Render Condition: ${getStatusEmoji(testResults.renderCondition.status)} ${testResults.renderCondition.details}${colors.reset}`);
    console.log(`${colors.cyan}5. Component Implementation: ${getStatusEmoji(testResults.componentImplementation.status)} ${testResults.componentImplementation.details}${colors.reset}`);
    
    // Overall status
    const allSuccess = Object.values(testResults).every(result => result.status === 'success');
    if (allSuccess) {
      console.log(`\n${colors.green}✅ All checks passed successfully. The Performance Management implementation is complete!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ One or more checks failed. The Performance Management implementation needs fixes.${colors.reset}`);
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Helper function to get status emoji
function getStatusEmoji(status) {
  switch (status) {
    case 'success':
      return '✅';
    case 'failure':
      return '❌';
    case 'error':
      return '⚠️';
    default:
      return '❓';
  }
}

// Run the main function
main(); 