'use client';

import React from 'react';
import PayrollTaxDashboard from '@/components/taxes/payroll/PayrollTaxDashboard';
import withPageAccess from '@/app/dashboard/components/withPageAccess';

function PayrollTaxPage() {
  return (
    <div className="p-6">
      <PayrollTaxDashboard />
    </div>
  );
}

export default withPageAccess(PayrollTaxPage, 'Payroll Tax');