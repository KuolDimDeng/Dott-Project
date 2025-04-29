const handlePayrollClick = (option) => {
  console.log(`[HRDashboard] Payroll option clicked: ${option}`);
  
  // Reset all states
  setShowEmployeeManagement(false);
  setShowTimesheetManagement(false);
  setShowPayrollManagement(false);
  setShowTaxManagement(false);
  setShowBenefitsManagement(false);
  
  // Set appropriate state based on option
  switch (option) {
    case 'run-payroll':
      setShowPayrollManagement(true);
      break;
    case 'transactions':
      // Handle payroll transactions
      break;
    case 'reports':
      // Handle payroll reports
      break;
    default:
      // Default case for payroll dashboard
      break;
  }
}; 