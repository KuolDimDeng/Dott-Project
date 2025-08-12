'use client';

import { useState } from 'react';
import DashboardRouter from '../dashboard/router/DashboardRouter';

export default function TestHRPage() {
  const [currentView, setCurrentView] = useState('hr-employees');
  
  const hrViews = [
    'hr-dashboard',
    'hr-employees',
    'hr-timesheets', 
    'hr-pay',
    'hr-benefits',
    'hr-performance',
    'hr-reports'
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">HR Route Testing</h1>
      
      <div className="flex gap-2 mb-6 flex-wrap">
        {hrViews.map(view => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className={`px-4 py-2 rounded ${
              currentView === view 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {view}
          </button>
        ))}
      </div>
      
      <div className="border rounded-lg p-4 bg-white">
        <div className="mb-2 text-sm text-gray-600">
          Current View: <span className="font-mono font-bold">{currentView}</span>
        </div>
        <DashboardRouter view={currentView} userData={{}} />
      </div>
    </div>
  );
}