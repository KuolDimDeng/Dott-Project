'use client';

import React from 'react';
import EmployeeTimesheet from '@/components/Timesheet/EmployeeTimesheet';

  console.log('🕐 [TimesheetTab] === COMPONENT LOADED ===');
  console.log('🕐 [TimesheetTab] Employee prop:', employee);
  console.log('🕐 [TimesheetTab] Session prop:', {
    authenticated: session?.authenticated,
    userEmail: session?.user?.email,
    employee: session?.employee
  });

  return (
    <EmployeeTimesheet />
  );
};

export default TimesheetTab;// Trigger deployment for timesheet system - v2
