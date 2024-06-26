// src/app/dashboard/components/Reports.jsx
import React, { useState } from 'react';
import { Button, Grid, Typography, Paper } from '@mui/material';
import ReportDisplay from '../forms/ReportDisplay';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState(null);

  const handleReportSelect = (reportType) => {
    setSelectedReport(reportType);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-around' }}>
          <Button variant="contained" onClick={() => handleReportSelect('balance_sheet')}>Balance Sheet</Button>
          <Button variant="contained" onClick={() => handleReportSelect('cash_flow')}>Cash Flow</Button>
          <Button variant="contained" onClick={() => handleReportSelect('income_statement')}>Income Statement</Button>
        </Paper>
      </Grid>
      <Grid item xs={12}>
        {selectedReport ? (
          <ReportDisplay reportType={selectedReport} />
        ) : (
          <Typography variant="h6" align="center">Select a report type to view</Typography>
        )}
      </Grid>
    </Grid>
  );
};

export default Reports;