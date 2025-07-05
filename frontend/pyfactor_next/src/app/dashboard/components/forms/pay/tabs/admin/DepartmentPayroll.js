'use client';


import React, { useState, useEffect } from 'react';

/**
 * DepartmentPayroll Component
 * Displays department-level payroll information for HR managers and owners
 */
const DepartmentPayroll = () => {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [departmentData, setDepartmentData] = useState(null);
  
  // Fetch department list
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        // In a production app, this would connect to the actual API
        setTimeout(() => {
          const deptList = [
            { id: 1, name: 'Engineering' },
            { id: 2, name: 'Marketing' },
            { id: 3, name: 'Sales' },
            { id: 4, name: 'Customer Support' },
            { id: 5, name: 'HR' },
            { id: 6, name: 'Management' }
          ];
          
          setDepartments(deptList);
          setSelectedDept(deptList[0].id); // Select first department by default
          setLoading(false);
        }, 600);
      } catch (error) {
        console.error('[DepartmentPayroll] Error fetching departments:', error);
        setLoading(false);
      }
    };
    
    fetchDepartments();
  }, []);
  
  // Fetch department data when selected department changes
  useEffect(() => {
    if (!selectedDept) return;
    
    const fetchDepartmentData = async () => {
      setLoading(true);
      
      try {
        // In a production app, this would connect to the actual API
        setTimeout(() => {
          // Sample data for the selected department - would be fetched from API in production
          setDepartmentData({
            id: selectedDept,
            name: departments.find(d => d.id === selectedDept)?.name || 'Department',
            stats: {
              totalEmployees: selectedDept === 1 ? 42 : 
                             selectedDept === 2 ? 18 : 
                             selectedDept === 3 ? 24 : 
                             selectedDept === 4 ? 36 : 
                             selectedDept === 5 ? 10 : 12,
              currentMonthCost: selectedDept === 1 ? 252000 : 
                               selectedDept === 2 ? 90000 : 
                               selectedDept === 3 ? 120000 : 
                               selectedDept === 4 ? 144000 : 
                               selectedDept === 5 ? 50000 : 96000,
              ytdCost: selectedDept === 1 ? 1512000 : 
                       selectedDept === 2 ? 540000 : 
                       selectedDept === 3 ? 720000 : 
                       selectedDept === 4 ? 864000 : 
                       selectedDept === 5 ? 300000 : 576000,
              avgSalary: selectedDept === 1 ? 72000 : 
                        selectedDept === 2 ? 60000 : 
                        selectedDept === 3 ? 60000 : 
                        selectedDept === 4 ? 48000 : 
                        selectedDept === 5 ? 60000 : 96000
            },
            employees: Array.from({ length: selectedDept === 1 ? 10 : 
                                           selectedDept === 2 ? 8 : 
                                           selectedDept === 3 ? 10 : 
                                           selectedDept === 4 ? 10 : 
                                           selectedDept === 5 ? 6 : 6 }, (_, i) => ({
              id: i + 1,
              name: `Employee ${i + 1}`,
              position: selectedDept === 1 ? 'Software Engineer' : 
                       selectedDept === 2 ? 'Marketing Specialist' : 
                       selectedDept === 3 ? 'Sales Representative' : 
                       selectedDept === 4 ? 'Support Specialist' : 
                       selectedDept === 5 ? 'HR Specialist' : 'Manager',
              salary: selectedDept === 1 ? 72000 + (Math.floor(Math.random() * 15) * 1000) : 
                      selectedDept === 2 ? 60000 + (Math.floor(Math.random() * 10) * 1000) : 
                      selectedDept === 3 ? 60000 + (Math.floor(Math.random() * 10) * 1000) : 
                      selectedDept === 4 ? 48000 + (Math.floor(Math.random() * 8) * 1000) : 
                      selectedDept === 5 ? 60000 + (Math.floor(Math.random() * 10) * 1000) : 
                                        96000 + (Math.floor(Math.random() * 20) * 1000),
              ytdEarnings: (selectedDept === 1 ? 72000 : 
                           selectedDept === 2 ? 60000 : 
                           selectedDept === 3 ? 60000 : 
                           selectedDept === 4 ? 48000 : 
                           selectedDept === 5 ? 60000 : 96000) * 6 / 12 + (Math.floor(Math.random() * 5000)),
              nextPayDate: '2023-07-15'
            }))
          });
          
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[DepartmentPayroll] Error fetching department data:', error);
        setLoading(false);
      }
    };
    
    fetchDepartmentData();
  }, [selectedDept, departments]);
  
  const handleDepartmentChange = (e) => {
    setSelectedDept(Number(e.target.value));
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  if (loading && !departmentData) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Department Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label htmlFor="department-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Department
        </label>
        <select
          id="department-select"
          value={selectedDept || ''}
          onChange={handleDepartmentChange}
          className="block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          disabled={loading}
        >
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Department Summary */}
          {departmentData && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900">{departmentData.name} Department</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Pay summary and employee details</p>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Total Employees</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {departmentData.stats.totalEmployees}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Current Month Cost</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatCurrency(departmentData.stats.currentMonthCost)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">YTD Cost</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatCurrency(departmentData.stats.ytdCost)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Average Salary</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatCurrency(departmentData.stats.avgSalary)}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Next Pay Date</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {departmentData.employees[0]?.nextPayDate || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
          
          {/* Employee Table */}
          {departmentData && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Employees</h3>
                <p className="mt-1 text-sm text-gray-500">Showing {departmentData.employees.length} of {departmentData.stats.totalEmployees} employees</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Annual Salary
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        YTD Earnings
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {departmentData.employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(employee.salary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(employee.ytdEarnings)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                          <a href="#">View Pay Details</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Previous
                  </a>
                  <a href="#" className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Next
                  </a>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">1</span> to <span className="font-medium">{departmentData.employees.length}</span> of{' '}
                      <span className="font-medium">{departmentData.stats.totalEmployees}</span> employees
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </a>
                      <a href="#" aria-current="page" className="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                        1
                      </a>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                      <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DepartmentPayroll; 