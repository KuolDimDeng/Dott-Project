'use client';


import React, { useState, useEffect } from 'react';

/**
 * CompanyPayroll Component
 * Displays company-wide payroll information for HR managers and owners
 */
const CompanyPayroll = () => {
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);
  
  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        // In a production app, this would connect to the actual API
        setTimeout(() => {
          // Sample data - would be fetched from API in production
          setPayrollData({
            totalEmployees: 148,
            activeEmployees: 142,
            onLeaveEmployees: 6,
            payrollStats: {
              currentMonth: {
                totalGrossPay: 742500.00,
                totalNetPay: 567012.50,
                totalTaxes: 111375.00,
                totalDeductions: 64112.50
              },
              previousMonth: {
                totalGrossPay: 735000.00,
                totalNetPay: 562275.00,
                totalTaxes: 110250.00,
                totalDeductions: 62475.00
              },
              ytd: {
                totalGrossPay: 4455000.00,
                totalNetPay: 3408075.00,
                totalTaxes: 668250.00,
                totalDeductions: 378675.00
              }
            },
            departments: [
              {
                id: 1,
                name: 'Engineering',
                employees: 42,
                monthlyCost: 252000.00,
                ytdCost: 1512000.00,
                avgSalary: 72000.00
              },
              {
                id: 2,
                name: 'Marketing',
                employees: 18, 
                monthlyCost: 90000.00,
                ytdCost: 540000.00,
                avgSalary: 60000.00
              },
              {
                id: 3,
                name: 'Sales',
                employees: 24,
                monthlyCost: 120000.00,
                ytdCost: 720000.00,
                avgSalary: 60000.00
              },
              {
                id: 4,
                name: 'Customer Support',
                employees: 36,
                monthlyCost: 144000.00,
                ytdCost: 864000.00,
                avgSalary: 48000.00
              },
              {
                id: 5,
                name: 'HR',
                employees: 10,
                monthlyCost: 50000.00,
                ytdCost: 300000.00,
                avgSalary: 60000.00
              },
              {
                id: 6,
                name: 'Management',
                employees: 12,
                monthlyCost: 96000.00,
                ytdCost: 576000.00,
                avgSalary: 96000.00
              }
            ],
            nextPayroll: {
              payDate: '2023-07-15',
              estimatedGross: 371250.00,
              employeeCount: 142,
              status: 'Scheduled'
            },
            recentPayrolls: [
              {
                id: 'PR2023060101',
                payDate: '2023-06-30',
                totalGross: 371250.00,
                totalNet: 283506.25,
                employeeCount: 142
              },
              {
                id: 'PR2023051501',
                payDate: '2023-06-15',
                totalGross: 371250.00,
                totalNet: 283506.25,
                employeeCount: 141
              },
              {
                id: 'PR2023050101',
                payDate: '2023-05-31',
                totalGross: 367500.00,
                totalNet: 280612.50,
                employeeCount: 140
              }
            ]
          });
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('[CompanyPayroll] Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchPayrollData();
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!payrollData) {
    return (
      <div className="bg-red-50 text-red-800 rounded-lg p-4">
        <h3 className="font-medium">Unable to load payroll data</h3>
        <p>Please try again later or contact support if the issue persists.</p>
      </div>
    );
  }
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Employees</h3>
          <p className="text-2xl font-bold">{payrollData.totalEmployees}</p>
          <div className="mt-1 text-xs text-gray-500">
            <span className="text-green-600 font-medium">{payrollData.activeEmployees} Active</span>
            {' · '}
            <span className="text-amber-600 font-medium">{payrollData.onLeaveEmployees} On Leave</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Current Month Payroll</h3>
          <p className="text-2xl font-bold">{formatCurrency(payrollData.payrollStats.currentMonth.totalGrossPay)}</p>
          <div className="mt-1 text-xs text-gray-500">
            Net Pay: {formatCurrency(payrollData.payrollStats.currentMonth.totalNetPay)}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">YTD Payroll</h3>
          <p className="text-2xl font-bold">{formatCurrency(payrollData.payrollStats.ytd.totalGrossPay)}</p>
          <div className="mt-1 text-xs text-gray-500">
            Net Pay: {formatCurrency(payrollData.payrollStats.ytd.totalNetPay)}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Next Scheduled Payroll</h3>
          <p className="text-2xl font-bold">{payrollData.nextPayroll.payDate}</p>
          <div className="mt-1 text-xs text-gray-500">
            Est. {formatCurrency(payrollData.nextPayroll.estimatedGross)} · {payrollData.nextPayroll.employeeCount} employees
          </div>
        </div>
      </div>
      
      {/* Department Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payroll by Department</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Cost
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  YTD Cost
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Salary
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollData.departments.map((dept) => (
                <tr key={dept.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dept.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dept.employees}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(dept.monthlyCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(dept.ytdCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(dept.avgSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Recent Payrolls */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Payrolls</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payroll ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollData.recentPayrolls.map((payroll) => (
                <tr key={payroll.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payroll.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payroll.payDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payroll.employeeCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(payroll.totalGross)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(payroll.totalNet)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                    <a href="#">View Details</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyPayroll; 