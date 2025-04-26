/**
 * Version0021_AddSupervisorColumns_EmployeeManagement.js
 * 
 * This script enhances the Employee Management component to display supervisor and 
 * supervising information in the List Employees tab.
 * 
 * Changes:
 * 1. Adds a new "Supervision" column to the employee list table
 * 2. Displays supervisor information and employees being supervised
 * 3. Maintains existing functionality and styling
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

// Modify the file content to add supervisor columns
let updatedContent = fileContent;

// 1. Add a new column header for Supervision
const tableHeadersPattern = /<th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">\s*Contact\s*<\/th>\s*<th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">\s*Actions\s*<\/th>/;

const newTableHeaders = `<th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supervision
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>`;

updatedContent = updatedContent.replace(tableHeadersPattern, newTableHeaders);

// 2. Add a new cell for Supervision information
const tableCellsPattern = /<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">\s*<div>{employee\.email}<\/div>\s*<div>{employee\.phone_number \|\| 'No Phone'}<\/div>\s*<\/td>\s*<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">/;

const newTableCells = `<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{employee.email}</div>
                  <div>{employee.phone_number || 'No Phone'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-col space-y-1">
                    {employee.areManager && (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Manager
                        </span>
                      </div>
                    )}
                    
                    {employee.supervising && employee.supervising.length > 0 ? (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Supervising:</span>
                        <div className="flex flex-wrap gap-1">
                          {employee.supervising.map(empId => {
                            const supervisedEmp = employees.find(e => e.id === empId);
                            return supervisedEmp ? (
                              <span key={empId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {supervisedEmp.first_name} {supervisedEmp.last_name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ) : employee.areManager ? (
                      <span className="text-xs text-gray-400">No direct reports</span>
                    ) : null}
                    
                    {employees.some(emp => emp.supervising && emp.supervising.includes(employee.id)) && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Reports to:</span>
                        <div className="flex flex-wrap gap-1">
                          {employees
                            .filter(emp => emp.supervising && emp.supervising.includes(employee.id))
                            .map(supervisor => (
                              <span key={supervisor.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {supervisor.first_name} {supervisor.last_name}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">`;

updatedContent = updatedContent.replace(tableCellsPattern, newTableCells);

// 3. Also add the supervision information to the employee details dialog
const employeeDetailsPattern = /<div>\s*<span className="block text-sm font-medium text-gray-500">Department<\/span>\s*<span className="block mt-1">{selectedEmployee\.department \|\| 'Not assigned'}<\/span>\s*<\/div>\s*<div>\s*<span className="block text-sm font-medium text-gray-500">Role<\/span>/;

const newEmployeeDetails = `<div>
                    <span className="block text-sm font-medium text-gray-500">Department</span>
                    <span className="block mt-1">{selectedEmployee.department || 'Not assigned'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Management</span>
                    <span className="block mt-1">
                      {selectedEmployee.areManager ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Manager
                        </span>
                      ) : 'Not a manager'}
                    </span>
                  </div>
                  
                  {selectedEmployee.supervising && selectedEmployee.supervising.length > 0 && (
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Supervising</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedEmployee.supervising.map(empId => {
                          const supervisedEmp = employees.find(e => e.id === empId);
                          return supervisedEmp ? (
                            <span key={empId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {supervisedEmp.first_name} {supervisedEmp.last_name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {employees.some(emp => emp.supervising && emp.supervising.includes(selectedEmployee.id)) && (
                    <div>
                      <span className="block text-sm font-medium text-gray-500">Reports to</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {employees
                          .filter(emp => emp.supervising && emp.supervising.includes(selectedEmployee.id))
                          .map(supervisor => (
                            <span key={supervisor.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {supervisor.first_name} {supervisor.last_name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Role</span>`;

updatedContent = updatedContent.replace(employeeDetailsPattern, newEmployeeDetails);

// Write the updated content
console.log(`Writing updated content to: ${employeeManagementPath}`);
fs.writeFileSync(employeeManagementPath, updatedContent);

console.log('Successfully added supervisor and supervising columns to the employee list!');
