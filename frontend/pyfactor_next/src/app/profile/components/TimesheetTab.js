'use client';

import React, { Suspense } from 'react';
// Using inline spinner instead of StandardSpinner

// Loading component
const TimesheetLoading = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading timesheet...</span>
  </div>
);

const TimesheetTab = ({ employee, session }) => {
  console.log('🕐 [TimesheetTab] === COMPONENT LOADED ===');
  console.log('🕐 [TimesheetTab] Employee prop:', employee);
  console.log('🕐 [TimesheetTab] Session prop:', {
    authenticated: session?.authenticated,
    userEmail: session?.user?.email,
    employee: session?.employee
  });

  // Lazy load the EmployeeTimesheet component
  const [EmployeeTimesheet, setEmployeeTimesheet] = React.useState(null);

  React.useEffect(() => {
    import('@/components/Timesheet/EmployeeTimesheet')
      .then((module) => {
        console.log('🕐 [TimesheetTab] EmployeeTimesheet module loaded:', module);
        setEmployeeTimesheet(() => module.default || module.EmployeeTimesheet || (() => <div>Failed to load timesheet component</div>));
      })
      .catch((error) => {
        console.error('🕐 [TimesheetTab] Error loading EmployeeTimesheet:', error);
        setEmployeeTimesheet(() => () => <div className="text-red-600">Error loading timesheet: {error.message}</div>);
      });
  }, []);

  if (!EmployeeTimesheet) {
    return <TimesheetLoading />;
  }

  return (
    <div className="w-full">
      <Suspense fallback={<TimesheetLoading />}>
        <EmployeeTimesheet />
      </Suspense>
    </div>
  );
};

export default TimesheetTab;
