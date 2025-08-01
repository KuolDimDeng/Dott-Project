'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import EmployeeTimesheet to avoid SSR issues
const EmployeeTimesheet = dynamic(
  () => import('@/components/Timesheet/EmployeeTimesheet'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading timesheet...</span>
      </div>
    )
  }
);

const TimesheetTab = ({ employee, session }) => {
  console.log('🕐 [TimesheetTab] === COMPONENT LOADED ===');
  console.log('🕐 [TimesheetTab] Employee prop:', employee);
  console.log('🕐 [TimesheetTab] Session prop:', {
    authenticated: session?.authenticated,
    userEmail: session?.user?.email,
    employee: session?.employee
  });

  return (
    <div className="w-full">
      <EmployeeTimesheet />
    </div>
  );
};

export default TimesheetTab;
