'use client';

import React, { useState, useEffect } from 'react';
// Remove the import of EmployeeManagement since this component shouldn't handle it
// import EmployeeManagement from './EmployeeManagement';

/**
 * HR Dashboard Component
 * Handles different sections of HR management
 */
function HRDashboard({ section = 'dashboard' }) {
  const [activeTab, setActiveTab] = useState(section);

  useEffect(() => {
    setActiveTab(section);
  }, [section]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  // Tab navigation component - remove employees from tabs
  const TabNavigation = () => (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {['dashboard', 'timesheets', 'pay', 'taxes', 'benefits', 'reports', 'performance'].map((tab) => (
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

  const renderSection = () => {
    switch (activeTab) {
      // Remove the employees case since it should be handled separately
      case 'dashboard':
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">
              HR Dashboard
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow p-6 h-full">
                  <h2 className="text-lg font-semibold mb-3">
                    Employee Overview
                  </h2>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800 font-medium">Total Employees</span>
                        <span className="text-2xl font-bold text-blue-600">12</span>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-800 font-medium">Active Employees</span>
                        <span className="text-2xl font-bold text-green-600">10</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-800 font-medium">On Leave</span>
                        <span className="text-2xl font-bold text-amber-600">2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow p-6 h-full">
                  <h2 className="text-lg font-semibold mb-3">
                    Recent HR Activities
                  </h2>
                  <div className="space-y-3">
                    <div className="border-l-4 border-blue-500 pl-3 py-1">
                      <p className="text-sm text-gray-600">John Doe started employment</p>
                      <p className="text-xs text-gray-400">Today, 9:30 AM</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3 py-1">
                      <p className="text-sm text-gray-600">Sarah Jones completed onboarding</p>
                      <p className="text-xs text-gray-400">Yesterday, 3:15 PM</p>
                    </div>
                    <div className="border-l-4 border-amber-500 pl-3 py-1">
                      <p className="text-sm text-gray-600">Mike Smith requested time off</p>
                      <p className="text-xs text-gray-400">Apr 12, 2023, 11:42 AM</p>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-3 py-1">
                      <p className="text-sm text-gray-600">Payroll processing completed</p>
                      <p className="text-xs text-gray-400">Apr 10, 2023, 5:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-3">
                    HR Analytics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Avg. Time to Hire</p>
                        <p className="text-2xl font-bold text-gray-800">14 days</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Employee Retention</p>
                        <p className="text-2xl font-bold text-gray-800">92%</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Training Completion</p>
                        <p className="text-2xl font-bold text-gray-800">87%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'timesheets':
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">
              Timesheets
            </h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="mt-4 text-lg font-medium text-gray-900">Timesheet Management</h2>
                <p className="mt-2 text-gray-600 text-sm">
                  Track employee hours, overtime, and time off in one place. <br />
                  This feature will be available soon.
                </p>
                <button 
                  className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </>
        );
      case 'taxes':
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">
              Tax Management
            </h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="mt-4 text-lg font-medium text-gray-900">Tax Management</h2>
                <p className="mt-2 text-gray-600 text-sm">
                  Manage employee tax forms, withholdings, and compliance reporting. <br />
                  This feature will be available soon.
                </p>
                <button 
                  className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </>
        );
      case 'benefits':
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">
              Employee Benefits
            </h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h2 className="mt-4 text-lg font-medium text-gray-900">Benefits Management</h2>
                <p className="mt-2 text-gray-600 text-sm">
                  Manage health insurance, retirement plans, and other employee benefits. <br />
                  This feature will be available soon.
                </p>
                <button 
                  className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </>
        );
      case 'reports':
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">
              HR Reports
            </h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="mt-4 text-lg font-medium text-gray-900">HR Reporting</h2>
                <p className="mt-2 text-gray-600 text-sm">
                  Generate reports on employee data, time off, payroll, and more. <br />
                  This feature will be available soon.
                </p>
                <button 
                  className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </>
        );
      default:
        return (
          <h1 className="text-2xl font-bold mb-4">
            Unknown HR Section
          </h1>
        );
    }
  };

  return (
    <div className="p-4">
      <TabNavigation />
      {renderSection()}
    </div>
  );
}

export default HRDashboard;