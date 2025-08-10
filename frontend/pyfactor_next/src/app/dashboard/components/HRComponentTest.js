'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import HR components to test them
const EmployeeManagement = dynamic(() => import('./forms/EmployeeManagement'), {
  loading: () => <div>Loading Employee Management...</div>,
  ssr: false
});

const TimesheetManagement = dynamic(() => import('./forms/TimesheetManagement'), {
  loading: () => <div>Loading Timesheet Management...</div>,
  ssr: false
});

const BenefitsManagement = dynamic(() => import('./forms/BenefitsManagement'), {
  loading: () => <div>Loading Benefits Management...</div>,
  ssr: false
});

const PerformanceManagement = dynamic(() => import('./forms/PerformanceManagement'), {
  loading: () => <div>Loading Performance Management...</div>,
  ssr: false
});

export default function HRComponentTest() {
  const [activeComponent, setActiveComponent] = useState('employees');
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[HRComponentTest] Active component:', activeComponent);
  }, [activeComponent]);

  const components = {
    employees: EmployeeManagement,
    timesheets: TimesheetManagement,
    benefits: BenefitsManagement,
    performance: PerformanceManagement
  };

  const ActiveComponent = components[activeComponent];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">HR Component Test</h2>
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveComponent('employees')}
            className={`px-4 py-2 rounded ${activeComponent === 'employees' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveComponent('timesheets')}
            className={`px-4 py-2 rounded ${activeComponent === 'timesheets' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Timesheets
          </button>
          <button
            onClick={() => setActiveComponent('benefits')}
            className={`px-4 py-2 rounded ${activeComponent === 'benefits' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Benefits
          </button>
          <button
            onClick={() => setActiveComponent('performance')}
            className={`px-4 py-2 rounded ${activeComponent === 'performance' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Performance
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error.message}
        </div>
      )}
      
      <div className="border rounded-lg p-4">
        {ActiveComponent ? <ActiveComponent /> : <div>Component not found</div>}
      </div>
    </div>
  );
}