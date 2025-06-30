'use client';

import React from 'react';
import { Box } from '@mui/material';
import PayrollTaxDashboard from '@/components/taxes/payroll/PayrollTaxDashboard';
import withPageAccess from '@/app/dashboard/components/withPageAccess';

function PayrollTaxPage() {
  return (
    <Box sx={{ p: 3 }}>
      <PayrollTaxDashboard />
    </Box>
  );
}

export default withPageAccess(PayrollTaxPage, 'Payroll Tax');