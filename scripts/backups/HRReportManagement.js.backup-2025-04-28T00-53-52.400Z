'use client';

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
              className={`${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
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
