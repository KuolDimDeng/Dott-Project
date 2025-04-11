'use client';

import React, { useState, useEffect } from 'react';
import EmployeeTaxManagement from './taxes/EmployeeTaxManagement';

/**
 * HR Dashboard Component
 * Handles different sections of HR management
 */
function HRDashboard({ section = 'dashboard' }) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderSection = () => {
    switch (section) {
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
                  <p className="text-gray-600 text-sm">
                    No employee data to display.
                  </p>
                </div>
              </div>
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow p-6 h-full">
                  <h2 className="text-lg font-semibold mb-3">
                    Recent HR Activities
                  </h2>
                  <p className="text-gray-600 text-sm">
                    No recent activities to display.
                  </p>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-3">
                    HR Analytics
                  </h2>
                  <p className="text-gray-600 text-sm">
                    No analytics data available.
                  </p>
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
              <p className="text-gray-600 text-sm">
                Timesheet management will be available soon.
              </p>
            </div>
          </>
        );
      case 'taxes':
        return <EmployeeTaxManagement />;
      case 'benefits':
        return (
          <>
            <h1 className="text-2xl font-bold mb-4">
              Employee Benefits
            </h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">
                Benefits management will be available soon.
              </p>
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
              <p className="text-gray-600 text-sm">
                HR reports will be available soon.
              </p>
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
      {renderSection()}
    </div>
  );
}

export default HRDashboard;