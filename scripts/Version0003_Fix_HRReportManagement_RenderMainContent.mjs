/**
 * @fileoverview Script to properly fix the import issue in RenderMainContent.js
 * @version 1.0.0
 * @date ${new Date().toISOString().split('T')[0]}
 * @description 
 * This script fixes the syntax error in RenderMainContent.js by removing the misplaced import
 * and properly adding it at the top of the file.
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
const RENDER_MAIN_CONTENT_PATH = path.join(FRONTEND_PATH, 'src/app/dashboard/components/RenderMainContent.js');
const HR_COMPONENTS_PATH = path.join(FRONTEND_PATH, 'src/app/dashboard/components/forms');

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
    description: 'Fix import statement in RenderMainContent.js for HRReportManagement component',
    executed: new Date().toISOString(),
    status: 'completed',
  };

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log('Updated script registry');
}

// Fix the RenderMainContent.js file
function fixRenderMainContent() {
  const filePath = RENDER_MAIN_CONTENT_PATH;
  const backupPath = createBackup(filePath);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // First, check if there is a malformed import in the middle of the file
  const malformedImportRegex = /import\s+HRReportManagement\s+from\s+['"]\.\.\/forms\/HRReportManagement['"];/g;
  const hasMalformedImport = content.match(malformedImportRegex);
  
  if (hasMalformedImport) {
    console.log('Found malformed import statement in the file');
    
    // Remove all instances of the malformed import
    content = content.replace(malformedImportRegex, '');
    
    // Check if the correct import already exists at the top
    const importAtTopRegex = /^import\s+HRReportManagement\s+from\s+['"]\.\.\/forms\/HRReportManagement['"];/m;
    const hasImportAtTop = importAtTopRegex.test(content.substring(0, 1000)); // Check only the first 1000 chars
    
    if (!hasImportAtTop) {
      console.log('Adding import statement at the top of the file');
      
      // Find a good place to add the import, preferably after other component imports
      if (content.includes("import HRDashboard from '../forms/HRDashboard';")) {
        content = content.replace(
          "import HRDashboard from '../forms/HRDashboard';",
          "import HRDashboard from '../forms/HRDashboard';\nimport HRReportManagement from '../forms/HRReportManagement';"
        );
      } else if (content.includes("import React")) {
        const reactImportEndPos = content.indexOf("import React") + content.substring(content.indexOf("import React")).indexOf(';') + 1;
        const beforeReactImport = content.substring(0, reactImportEndPos);
        const afterReactImport = content.substring(reactImportEndPos);
        content = beforeReactImport + "\nimport HRReportManagement from '../forms/HRReportManagement';" + afterReactImport;
      } else {
        // If all else fails, add it at the very top
        content = "import HRReportManagement from '../forms/HRReportManagement';\n" + content;
      }
    }
  } else {
    console.log('No malformed import found, checking if import exists at the top');
    
    // Check if the correct import already exists at the top
    const importAtTopRegex = /^import\s+HRReportManagement\s+from\s+['"]\.\.\/forms\/HRReportManagement['"];/m;
    const hasImportAtTop = importAtTopRegex.test(content.substring(0, 1000)); // Check only the first 1000 chars
    
    if (!hasImportAtTop) {
      console.log('Import not found at the top, adding it');
      
      // Find a good place to add the import, preferably after other component imports
      if (content.includes("import HRDashboard from '../forms/HRDashboard';")) {
        content = content.replace(
          "import HRDashboard from '../forms/HRDashboard';",
          "import HRDashboard from '../forms/HRDashboard';\nimport HRReportManagement from '../forms/HRReportManagement';"
        );
      } else if (content.includes("import React")) {
        const reactImportEndPos = content.indexOf("import React") + content.substring(content.indexOf("import React")).indexOf(';') + 1;
        const beforeReactImport = content.substring(0, reactImportEndPos);
        const afterReactImport = content.substring(reactImportEndPos);
        content = beforeReactImport + "\nimport HRReportManagement from '../forms/HRReportManagement';" + afterReactImport;
      } else {
        // If all else fails, add it at the very top
        content = "import HRReportManagement from '../forms/HRReportManagement';\n" + content;
      }
    } else {
      console.log('Import statement already exists at the top of the file');
    }
  }
  
  // Also make sure the showReportsManagement component rendering is correctly added
  if (!content.includes('else if (showReportsManagement)')) {
    console.log('Adding the showReportsManagement condition');
    
    // Find a good place to add the condition, after showHRDashboard
    if (content.includes('else if (showHRDashboard)')) {
      const hrDashboardCondition = content.substring(content.indexOf('else if (showHRDashboard)'));
      const hrDashboardConditionEnd = hrDashboardCondition.indexOf('}') + content.indexOf('else if (showHRDashboard)');
      
      const reportsManagementCondition = `
      } else if (showReportsManagement) {
        console.log('[RenderMainContent] Rendering HRReportManagement component');
        ActiveComponent = HRReportManagement;
        componentProps = {};`;
      
      content = content.substring(0, hrDashboardConditionEnd + 1) + reportsManagementCondition + content.substring(hrDashboardConditionEnd + 1);
    }
  } else {
    console.log('showReportsManagement condition already exists');
  }
  
  // Save the modified file
  fs.writeFileSync(filePath, content);
  console.log(`Fixed RenderMainContent.js file`);
  
  return backupPath;
}

// Update HRReportManagement to match backend report types
function updateHRReportManagement() {
  const filePath = path.join(HR_COMPONENTS_PATH, 'HRReportManagement.js');
  const backupPath = createBackup(filePath);
  
  // Define the updated component content with appropriate report types that match backend
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
        <h3 className="text-lg font-medium mb-2">Profit & Loss</h3>
        <p className="text-sm text-gray-600 mb-4">Income statement showing revenue, expenses, and net income.</p>
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
        <h3 className="text-lg font-medium mb-2">Balance Sheet</h3>
        <p className="text-sm text-gray-600 mb-4">Financial statement showing assets, liabilities, and equity.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">Cash Flow</h3>
        <p className="text-sm text-gray-600 mb-4">Statement showing cash inflows and outflows.</p>
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

  // Write the updated component
  fs.writeFileSync(filePath, componentContent);
  console.log(`Updated HRReportManagement.js to match backend report types`);
  
  return backupPath;
}

// Main function to execute all updates
async function main() {
  try {
    console.log('Starting fix for RenderMainContent.js and HRReportManagement.js');
    
    // Fix the files
    const renderMainContentBackup = fixRenderMainContent();
    const hrReportManagementBackup = updateHRReportManagement();
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('\nFix completed successfully!');
    console.log('\nBackups created:');
    console.log(`- RenderMainContent.js: ${renderMainContentBackup}`);
    console.log(`- HRReportManagement.js: ${hrReportManagementBackup}`);
    
    console.log('\nChanges made:');
    console.log('1. Fixed the misplaced import statement for HRReportManagement in RenderMainContent.js');
    console.log('2. Updated HRReportManagement.js component to include reports that match the backend model');
    
  } catch (error) {
    console.error('Error fixing RenderMainContent.js:', error);
    process.exit(1);
  }
}

// Execute the script
main(); 