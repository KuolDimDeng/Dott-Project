import React, { useState, useEffect } from 'react';
import { Typography, Paper, CircularProgress, Button, Stack } from '@mui/material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([reportData]);
    XLSX.utils.book_append_sheet(wb, ws, reportType);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `${reportType}_report.xlsx`);
  };

  const exportToCSV = () => {
    const csvContent = Object.entries(reportData).map(([key, value]) => `${key},${value}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${reportType}_report.csv`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`${reportType.replace('_', ' ').toUpperCase()} Report`, 14, 15);
    doc.autoTable({
      head: [['Item', 'Value']],
      body: Object.entries(reportData).map(([key, value]) => [key, `$${value}`]),
      startY: 20,
    });
    doc.save(`${reportType}_report.pdf`);
  };

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
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={exportToExcel}>Export to Excel</Button>
        <Button variant="contained" onClick={exportToCSV}>Export to CSV</Button>
        <Button variant="contained" onClick={exportToPDF}>Export to PDF</Button>
      </Stack>
      <Typography variant="h5" gutterBottom>
        {reportType.replace('_', ' ').toUpperCase()}
      </Typography>
      {renderReportContent()}
    </Paper>
  );
};

export default ReportDisplay;