// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/ReportDisplay.jsx
import React, { useState, useEffect } from 'react';
import { Typography, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';

const ReportDisplay = ({ reportType }) => {
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:8000/api/reports/generate/${reportType}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReportData(response.data);
      } catch (error) {
        console.error('Error fetching report data:', error);
        setError('Failed to load report. Please try again.');
      }
    };

    fetchReportData();
  }, [reportType]);

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!reportData) {
    return <CircularProgress />;
  }

  const renderReportContent = () => {
    switch (reportType) {
      case 'balance_sheet':
        return (
          <>
            <Typography variant="h6">Assets: ${reportData.assets}</Typography>
            <Typography variant="h6">Liabilities: ${reportData.liabilities}</Typography>
            <Typography variant="h6">Equity: ${reportData.equity}</Typography>
            <Typography variant="h6">Total: ${reportData.total}</Typography>
          </>
        );
      case 'cash_flow':
        return (
          <>
            <Typography variant="h6">Operating Activities: ${reportData.operating_activities}</Typography>
            <Typography variant="h6">Investing Activities: ${reportData.investing_activities}</Typography>
            <Typography variant="h6">Financing Activities: ${reportData.financing_activities}</Typography>
            <Typography variant="h6">Net Cash Flow: ${reportData.net_cash_flow}</Typography>
          </>
        );
      case 'income_statement':
        return (
          <>
            <Typography variant="h6">Revenue: ${reportData.revenue}</Typography>
            <Typography variant="h6">Expenses: ${reportData.expenses}</Typography>
            <Typography variant="h6">Net Income: ${reportData.net_income}</Typography>
          </>
        );
      default:
        return <Typography>Invalid report type</Typography>;
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {reportType.replace('_', ' ').toUpperCase()}
      </Typography>
      {renderReportContent()}
    </Paper>
  );
};

export default ReportDisplay;