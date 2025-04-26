/**
 * Version0035_FixDetailsButtonDisplay_EmployeeManagement.js
 * 
 * This script fixes the issue with the Details button not appearing in the Actions column
 * of the employee list. The problem is that there are two different implementations of
 * the Actions column in the code:
 * 1. The React Table columns definition (which has Edit, Details, Delete)
 * 2. The hardcoded JSX in the table rendering (which only has Edit, Delete)
 * 
 * This script updates the hardcoded JSX to match the React Table columns definition
 * or removes it entirely to use the React Table rendering.
 * 
 * Date: 2025-04-25
 * Version: 1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const employeeManagementPath = path.join(__dirname, '../frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js');

// Create backup
const backupDate = new Date().toISOString().replace(/:/g, '-');
const backupPath = `${employeeManagementPath}.backup-${backupDate}`;

// Read the file
console.log(`Reading file: ${employeeManagementPath}`);
const fileContent = fs.readFileSync(employeeManagementPath, 'utf8');

// Create backup
console.log(`Creating backup: ${backupPath}`);
fs.writeFileSync(backupPath, fileContent);

// Modify the file content to fix the Actions column
let updatedContent = fileContent;

// The issue is that we have two implementations of the Actions column:
// 1. The React Table columns definition (which has Edit, Details, Delete)
// 2. The hardcoded JSX in the table rendering (which only has Edit, Delete)

// We need to update the table rendering to use the React Table columns
// Find the table body rendering section
const tableBodyPattern = /<tbody className="bg-white divide-y divide-gray-200">([\s\S]*?)<\/tbody>/;
const tableBodyMatch = updatedContent.match(tableBodyPattern);

if (tableBodyMatch) {
  // Extract the current table body content
  const currentTableBody = tableBodyMatch[0];
  
  // Find the hardcoded Actions column in the table row
  const actionsColumnPattern = /<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">([\s\S]*?)<\/td>/;
  const actionsColumnMatch = currentTableBody.match(actionsColumnPattern);
  
  if (actionsColumnMatch) {
    // Replace the hardcoded Actions column with a version that includes the Details button
    const updatedActionsColumn = `<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEmployee(employee);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                          setShowEmployeeDetails(true);
                          setIsCreating(false);
                          setIsEditing(false);
                        }}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                      >
                        Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmployee(employee.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>`;
    
    // Replace the Actions column in the table body
    const updatedTableBody = currentTableBody.replace(actionsColumnMatch[0], updatedActionsColumn);
    
    // Update the content
    updatedContent = updatedContent.replace(currentTableBody, updatedTableBody);
    console.log('Updated hardcoded Actions column to include Details button');
  }
}

// Alternative approach: Use react-table's built-in rendering
// This is a more elegant solution that uses the columns definition we already updated
const tableRenderingPattern = /<table className="min-w-full divide-y divide-gray-200">([\s\S]*?)<\/table>/;
const tableRenderingMatch = updatedContent.match(tableRenderingPattern);

if (tableRenderingMatch) {
  // Replace the entire table with react-table's rendering
  const reactTableRendering = `<table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {headerGroups.map(headerGroup => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map(column => (
                      <th
                        {...column.getHeaderProps(column.getSortByToggleProps())}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.render('Header')}
                        <span>
                          {column.isSorted
                            ? column.isSortedDesc
                              ? ' 🔽'
                              : ' 🔼'
                            : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
                {page.map((row, i) => {
                  prepareRow(row)
                  return (
                    <tr 
                      {...row.getRowProps()} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedEmployee(row.original);
                        setShowEmployeeDetails(true);
                      }}
                    >
                      {row.cells.map(cell => {
                        return (
                          <td
                            {...cell.getCellProps()}
                            className="px-6 py-4 whitespace-nowrap"
                            onClick={(e) => {
                              // Prevent row click for action buttons
                              if (cell.column.id === 'actions') {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {cell.render('Cell')}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>`;
  
  // Update the content
  updatedContent = updatedContent.replace(tableRenderingMatch[0], reactTableRendering);
  console.log('Updated table rendering to use react-table');
}

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

// Update the script registry
try {
  const scriptRegistryPath = path.join(__dirname, 'script_registry.md');
  let scriptRegistryContent = '';
  
  if (fs.existsSync(scriptRegistryPath)) {
    scriptRegistryContent = fs.readFileSync(scriptRegistryPath, 'utf8');
  } else {
    scriptRegistryContent = '# Script Registry\n\nThis file tracks all scripts, their purpose, and execution status.\n\n| Script Name | Purpose | Execution Date | Status |\n| ----------- | ------- | -------------- | ------ |\n';
  }
  
  // Add entry for this script if it doesn't exist
  if (!scriptRegistryContent.includes('Version0035_FixDetailsButtonDisplay_EmployeeManagement.js')) {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| Version0035_FixDetailsButtonDisplay_EmployeeManagement.js | Fix Details button display in Actions column | ${today} | Completed |\n`;
    
    // Find the table in the registry content
    const tableStart = scriptRegistryContent.indexOf('| Script Name | Purpose');
    if (tableStart !== -1) {
      const tableHeaderEnd = scriptRegistryContent.indexOf('\n', tableStart) + 1;
      const tableDividerEnd = scriptRegistryContent.indexOf('\n', tableHeaderEnd) + 1;
      
      // Add the new entry after the table header and divider
      scriptRegistryContent = 
        scriptRegistryContent.substring(0, tableDividerEnd) + 
        newEntry + 
        scriptRegistryContent.substring(tableDividerEnd);
    } else {
      // If we can't find the table, just append to the end
      scriptRegistryContent += newEntry;
    }
    
    fs.writeFileSync(scriptRegistryPath, scriptRegistryContent);
    console.log('Updated script registry');
  }
} catch (error) {
  console.error('Error updating script registry:', error);
}

console.log('Successfully fixed the Details button display in the Actions column!')
