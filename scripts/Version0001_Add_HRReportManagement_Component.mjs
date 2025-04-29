/**
 * @fileoverview Script to add HRReportManagement component to handle the HR Reports functionality
 * @version 1.0.0
 * @date ${new Date().toISOString().split('T')[0]}
 * @description 
 * This script creates a new HRReportManagement component and updates the necessary files to make
 * the Reports option in the HR menu functional. The component will display tabs for Employees, Pay,
 * Timesheets, and Benefits reports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const FRONTEND_PATH = '/Users/kuoldeng/projectx/frontend/pyfactor_next';
const SCRIPTS_PATH = '/Users/kuoldeng/projectx/scripts';
const HR_COMPONENTS_PATH = path.join(FRONTEND_PATH, 'src/app/dashboard/components/forms');
const RENDER_MAIN_CONTENT_PATH = path.join(FRONTEND_PATH, 'src/app/dashboard/components/RenderMainContent.js');
const DASHBOARD_CONTENT_PATH = path.join(FRONTEND_PATH, 'src/components/Dashboard/DashboardContent.js');

// Backup function - creates backup of files before modifying them
function createBackup(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const backupPath = path.join(SCRIPTS_PATH, 'backups', path.basename(filePath) + `.backup-${new Date().toISOString().replace(/:/g, '-')}`);
  
  // Create the backup directory if it doesn't exist
  if (!fs.existsSync(path.join(SCRIPTS_PATH, 'backups'))) {
    fs.mkdirSync(path.join(SCRIPTS_PATH, 'backups'), { recursive: true });
  }
  
  fs.writeFileSync(backupPath, content);
  console.log(`Created backup at: ${backupPath}`);
  return backupPath;
}

// Update script registry
function updateScriptRegistry() {
  const registryPath = path.join(SCRIPTS_PATH, 'script_registry.json');
  let registry = {};

  try {
    if (fs.existsSync(registryPath)) {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading script registry:', error);
  }

  const scriptName = path.basename(__filename);
  registry[scriptName] = {
    name: scriptName,
    description: 'Implement HRReportManagement component for the HR Reports menu section',
    executed: new Date().toISOString(),
    status: 'completed',
  };

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log('Updated script registry');
}

// Create HRReportManagement component
function createHRReportManagementComponent() {
  const componentPath = path.join(HR_COMPONENTS_PATH, 'HRReportManagement.js');
  const componentContent = `'use client';

import React, { useState } from 'react';

/**
 * HRReportManagement Component
 * @description Displays HR-related reports with tabs for Employees, Pay, Timesheets, and Benefits
 */
function HRReportManagement() {
  const [activeTab, setActiveTab] = useState('employees');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Tab navigation component
  const TabNavigation = () => (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {['employees', 'pay', 'timesheets', 'benefits'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={\`\${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize\`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  const renderEmployeeReports = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Employee Directory</h3>
        <p className="text-sm text-gray-600 mb-4">Complete listing of all employees with key information.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Employee Demographics</h3>
        <p className="text-sm text-gray-600 mb-4">Breakdown of employee demographics and diversity metrics.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Headcount Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">Analysis of employee headcount by department and role.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Turnover Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">Analysis of employee turnover and retention metrics.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  );

  const renderPayReports = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Payroll Summary</h3>
        <p className="text-sm text-gray-600 mb-4">Summary of payroll expenses by period.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Compensation Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">Analysis of employee compensation by role and department.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Bonus & Commission</h3>
        <p className="text-sm text-gray-600 mb-4">Summary of bonus and commission payments.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Payroll Tax</h3>
        <p className="text-sm text-gray-600 mb-4">Summary of payroll tax payments and liabilities.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  );

  const renderTimesheetReports = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Time & Attendance</h3>
        <p className="text-sm text-gray-600 mb-4">Summary of employee attendance and time tracking.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Overtime Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">Analysis of overtime hours by employee and department.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">PTO & Leave</h3>
        <p className="text-sm text-gray-600 mb-4">Summary of paid time off and leave usage.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Project Time Allocation</h3>
        <p className="text-sm text-gray-600 mb-4">Analysis of time spent on different projects.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  );

  const renderBenefitsReports = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Benefits Enrollment</h3>
        <p className="text-sm text-gray-600 mb-4">Summary of employee benefits enrollment.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Benefits Costs</h3>
        <p className="text-sm text-gray-600 mb-4">Analysis of benefits costs by plan and type.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Retirement Plan</h3>
        <p className="text-sm text-gray-600 mb-4">Summary of retirement plan participation and contributions.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Health Insurance</h3>
        <p className="text-sm text-gray-600 mb-4">Analysis of health insurance usage and costs.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'employees':
        return renderEmployeeReports();
      case 'pay':
        return renderPayReports();
      case 'timesheets':
        return renderTimesheetReports();
      case 'benefits':
        return renderBenefitsReports();
      default:
        return renderEmployeeReports();
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">HR Reports</h1>
      <TabNavigation />
      {renderActiveTab()}
    </div>
  );
}

export default HRReportManagement;
`;

  fs.writeFileSync(componentPath, componentContent);
  console.log(`Created HRReportManagement component at: ${componentPath}`);
}

// Create documentation file
function createDocumentation() {
  const docPath = path.join(HR_COMPONENTS_PATH, 'HR_REPORT_MANAGEMENT.md');
  const docContent = `# HR Report Management

## Overview
The HR Report Management feature allows users to access and generate reports related to HR functions, including:
- Employee reports
- Pay reports
- Timesheet reports
- Benefits reports

## Implementation Details
- **Component**: \`HRReportManagement.js\`
- **Route**: Accessed via HR menu > Reports
- **Functionality**: Displays tabs for different report categories and allows users to generate reports

## Features
- Tab-based navigation between report categories
- Report cards displaying available reports
- Action buttons to generate each report

## Technical Notes
- Uses React hooks for state management
- Implemented with Tailwind CSS for styling
- No external dependencies required

## Future Enhancements
- Connect to backend API for real report generation
- Add report filters and parameters
- Implement report export functionality (PDF, CSV)
- Add data visualization for key metrics
`;

  fs.writeFileSync(docPath, docContent);
  console.log(`Created documentation at: ${docPath}`);
}

// Update RenderMainContent.js to handle the HRReportManagement component
function updateRenderMainContent() {
  const filePath = RENDER_MAIN_CONTENT_PATH;
  const backupPath = createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for HRReportManagement if not already present
  if (!content.includes('import HRReportManagement from')) {
    const importSection = content.split('import React')[0];
    const remainingContent = content.slice(importSection.length);
    
    // Find a good spot to add the import near other HR component imports
    if (content.includes('import HRDashboard from')) {
      content = content.replace(
        /import HRDashboard from '..\/forms\/HRDashboard';/,
        "import HRDashboard from '../forms/HRDashboard';\nimport HRReportManagement from '../forms/HRReportManagement';"
      );
    } else {
      // Add after other imports if HRDashboard import not found
      const lastImportIndex = content.lastIndexOf('import');
      const lastImportStatement = content.substring(lastImportIndex, content.indexOf('\n', lastImportIndex) + 1);
      content = content.replace(
        lastImportStatement,
        `${lastImportStatement}import HRReportManagement from '../forms/HRReportManagement';\n`
      );
    }
  }
  
  // Add HRReportManagement to the component rendering logic
  if (content.includes('else if (showHRDashboard)')) {
    if (!content.includes('else if (showReportsManagement)')) {
      content = content.replace(
        /else if \(showHRDashboard\) \{[\s\S]+?componentProps = \{ section: hrSection \};[\s\S]+?\}/,
        match => {
          return match + `\n      } else if (showReportsManagement) {
        console.log('[RenderMainContent] Rendering HRReportManagement component');
        ActiveComponent = HRReportManagement;
        componentProps = {};`;
        }
      );
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated RenderMainContent.js`);
  return backupPath;
}

// Update HR click handler in DashboardContent to handle the Reports menu item correctly
function updateDashboardContent() {
  const filePath = DASHBOARD_CONTENT_PATH;
  const backupPath = createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update the handleHRClick function to handle reports correctly
  if (content.includes('const handleHRClick = useCallback')) {
    // Check if reports is already properly handled
    if (content.includes('showReportsManagement: section === \'reports\'')) {
      console.log('Reports section already properly handled in handleHRClick');
    } else {
      content = content.replace(
        /updateState\(\{[\s\S]+?showHRDashboard: section === 'dashboard',[\s\S]+?showEmployeeManagement: section === 'employees',[\s\S]+?(\/\/ Benefits is handled in the specific if-block above)[\s\S]+?(showReportsManagement: section === 'reports'|hrSection: section)/,
        match => {
          if (match.includes('showReportsManagement: section === \'reports\'')) {
            return match;
          } else {
            return match.replace(
              'hrSection: section || \'dashboard\'',
              'showReportsManagement: section === \'reports\',\n        hrSection: section || \'dashboard\''
            );
          }
        }
      );
    }
  }
  
  // Make sure showReportsManagement is included in the initial state
  if (content.includes('const [uiState, setUiState] = useState(')) {
    if (!content.includes('showReportsManagement: false')) {
      content = content.replace(
        /showHRDashboard: false,[\s\S]+?showEmployeeManagement: false,[\s\S]+?showTaxManagement: false,/,
        match => {
          if (match.includes('showReportsManagement: false')) {
            return match;
          } else {
            return match + '\n    showReportsManagement: false,';
          }
        }
      );
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated DashboardContent.js`);
  return backupPath;
}

// Update the Reports menu item in listItems.js to use the standardized onClick pattern
function updateListItems() {
  const filePath = path.join(FRONTEND_PATH, 'src/app/dashboard/components/lists/listItems.js');
  const backupPath = createBackup(filePath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the HR section with Reports menu item
  if (content.includes('{ label: \'Reports\', onClick: handleHRClick, value: \'reports\' }')) {
    content = content.replace(
      /{ label: 'Reports', onClick: handleHRClick, value: 'reports' },/,
      `{ 
          label: 'Reports', 
          onClick: () => {
            console.log('[listItems] Reports menu item clicked');
            // Dispatch a standardized navigation event
            const navigationKey = \`nav-\${Date.now()}\`;
            const payload = { 
              item: 'reports', 
              navigationKey
            };
            
            // Dispatch navigation events for all listeners
            window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
            
            // Call the handler directly
            if (typeof handleHRClick === 'function') {
              handleHRClick('reports');
            }
          }
        },`
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated listItems.js`);
  return backupPath;
}

// Main function to execute all updates
async function main() {
  try {
    console.log('Starting implementation of HRReportManagement component');
    
    // Create the component and documentation
    createHRReportManagementComponent();
    createDocumentation();
    
    // Update necessary files
    const renderMainContentBackup = updateRenderMainContent();
    const dashboardContentBackup = updateDashboardContent();
    const listItemsBackup = updateListItems();
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('\nImplementation completed successfully!');
    console.log('\nBackups created:');
    console.log(`- RenderMainContent.js: ${renderMainContentBackup}`);
    console.log(`- DashboardContent.js: ${dashboardContentBackup}`);
    console.log(`- listItems.js: ${listItemsBackup}`);
    
    console.log('\nChanges made:');
    console.log('1. Created HRReportManagement component with tabs for Employees, Pay, Timesheets, and Benefits reports');
    console.log('2. Added documentation file for HR Report Management');
    console.log('3. Updated RenderMainContent.js to handle the HRReportManagement component');
    console.log('4. Updated DashboardContent.js to properly handle the Reports menu item click');
    console.log('5. Enhanced the Reports menu item in listItems.js to use the standardized onClick pattern');
    
    console.log('\nTo verify:');
    console.log('1. Navigate to the HR menu in the dashboard');
    console.log('2. Click on the Reports menu item');
    console.log('3. Verify that the HRReportManagement component renders with the four tabs');
    
  } catch (error) {
    console.error('Error implementing HRReportManagement component:', error);
    process.exit(1);
  }
}

// Execute the script
main(); 