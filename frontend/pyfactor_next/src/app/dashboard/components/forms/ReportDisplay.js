import React, { useState, useEffect } from 'react';
import { Typography, Paper, CircularProgress, Button, Stack, Box, Grid, FormControl, InputLabel, Select, MenuItem, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DateRangePicker } from '@mui/x-date-pickers-pro';
import { LocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterDateFns } from '@mui/x-date-pickers-pro/AdapterDateFns';
import { TextField } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { toast } from 'react-toastify';

export default function ReportDisplay({ type = 'general' }) {
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generalReportTypes = [
    { value: 'profit-loss', label: 'Profit and Loss' },
    { value: 'balance-sheet', label: 'Balance Sheet' },
    { value: 'cash-flow', label: 'Cash Flow' },
    { value: 'tax-summary', label: 'Tax Summary' },
  ];

  const salesReportTypes = [
    { value: 'sales-by-customer', label: 'Sales by Customer' },
    { value: 'sales-by-product', label: 'Sales by Product' },
    { value: 'sales-by-service', label: 'Sales by Service' },
    { value: 'invoice-aging', label: 'Invoice Aging' }, 
    { value: 'sales-tax', label: 'Sales Tax' },
    { value: 'sales-by-rep', label: 'Sales by Representative' },
    { value: 'estimate-conversion', label: 'Estimate to Invoice Conversion' },
  ];

  const reportTypes = type === 'sales' ? salesReportTypes : generalReportTypes;

  const handleSubmit = async () => {
    if (!reportType || !dateRange[0] || !dateRange[1]) {
      toast.error('Please select report type and date range');
      return;
    }

    setLoading(true);
    try {
      const formattedStartDate = dateRange[0].toISOString().split('T')[0];
      const formattedEndDate = dateRange[1].toISOString().split('T')[0];

      const response = await axios.get('/api/reports/', {
        params: {
          type: reportType,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
      });

      setReportData(response.data);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
      
      // For demo purposes, generate mock data
      if (type === 'sales') {
        generateMockSalesReport(reportType);
      } else {
        setReportData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateMockSalesReport = (reportType) => {
    let mockData = null;
    
    switch(reportType) {
      case 'sales-by-customer':
        mockData = {
          title: 'Sales by Customer',
          dateRange: `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`,
          columns: ['Customer', 'Number of Orders', 'Total Amount', 'Average Order'],
          data: [
            ['Acme Corporation', 12, '$45,678.90', '$3,806.58'],
            ['Globex Industries', 8, '$32,456.78', '$4,057.10'],
            ['Wayne Enterprises', 6, '$28,765.43', '$4,794.24'],
            ['Stark Industries', 5, '$23,987.65', '$4,797.53'],
            ['Umbrella Corporation', 4, '$19,876.54', '$4,969.14'],
          ],
          summary: {
            totalCustomers: 5,
            totalOrders: 35,
            totalSales: '$150,765.30',
            averageOrderValue: '$4,307.58'
          }
        };
        break;
      case 'sales-by-product':
        mockData = {
          title: 'Sales by Product',
          dateRange: `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`,
          columns: ['Product', 'Quantity Sold', 'Total Revenue', 'Average Price'],
          data: [
            ['Product A', 156, '$15,600.00', '$100.00'],
            ['Product B', 98, '$14,700.00', '$150.00'],
            ['Product C', 75, '$22,500.00', '$300.00'],
            ['Product D', 45, '$13,500.00', '$300.00'],
            ['Product E', 32, '$9,600.00', '$300.00'],
          ],
          summary: {
            totalProducts: 5,
            totalQuantity: 406,
            totalRevenue: '$75,900.00',
            averagePrice: '$186.95'
          }
        };
        break;
      case 'sales-by-service':
        mockData = {
          title: 'Sales by Service',
          dateRange: `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`,
          columns: ['Service', 'Hours Billed', 'Total Revenue', 'Average Rate'],
          data: [
            ['Consulting', 250, '$37,500.00', '$150.00/hr'],
            ['Development', 320, '$48,000.00', '$150.00/hr'],
            ['Design', 180, '$22,500.00', '$125.00/hr'],
            ['Support', 420, '$42,000.00', '$100.00/hr'],
            ['Training', 150, '$22,500.00', '$150.00/hr'],
          ],
          summary: {
            totalServices: 5,
            totalHours: 1320,
            totalRevenue: '$172,500.00',
            averageRate: '$130.68/hr'
          }
        };
        break;
      case 'invoice-aging':
        mockData = {
          title: 'Invoice Aging Report',
          dateRange: `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`,
          columns: ['Customer', 'Invoice #', 'Date', 'Amount', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '>90 Days'],
          data: [
            ['Acme Corporation', 'INV-1001', '01/15/2023', '$5,678.90', '$5,678.90', '', '', '', ''],
            ['Globex Industries', 'INV-1002', '12/05/2022', '$4,567.89', '', '$4,567.89', '', '', ''],
            ['Wayne Enterprises', 'INV-1003', '11/20/2022', '$6,789.01', '', '', '$6,789.01', '', ''],
            ['Stark Industries', 'INV-1004', '10/10/2022', '$3,456.78', '', '', '', '$3,456.78', ''],
            ['Umbrella Corporation', 'INV-1005', '09/01/2022', '$7,890.12', '', '', '', '', '$7,890.12'],
          ],
          summary: {
            totalInvoices: 5,
            totalAmount: '$28,382.70',
            current: '$5,678.90',
            '1-30Days': '$4,567.89',
            '31-60Days': '$6,789.01',
            '61-90Days': '$3,456.78',
            'over90Days': '$7,890.12'
          }
        };
        break;
      default:
        mockData = {
          title: 'Sales Report',
          dateRange: `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`,
          message: 'Sample report data not available for this report type'
        };
    }
    
    setReportData(mockData);
  };

  const renderReportData = () => {
    if (!reportData) return null;

    return (
      <Box mt={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {reportData.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {reportData.dateRange}
          </Typography>

          {reportData.message ? (
            <Typography>{reportData.message}</Typography>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {reportData.columns.map((column, index) => (
                        <TableCell key={index}>{column}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.data.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {reportData.summary && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Summary
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(reportData.summary).map(([key, value]) => (
                      <Grid item xs={6} sm={3} key={key}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str) { return str.toUpperCase(); })}
                          </Typography>
                          <Typography variant="h6">{value}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </>
          )}

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button variant="outlined" startIcon={<FileDownloadIcon />}>
              Download PDF
            </Button>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} sx={{ ml: 2 }}>
              Download CSV
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {type === 'sales' ? 'Sales Reports' : 'Reports'}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate Report
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="Report Type"
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateRangePicker
                startText="Start Date"
                endText="End Date"
                value={dateRange}
                onChange={(newValue) => setDateRange(newValue)}
                renderInput={(startProps, endProps) => (
                  <>
                    <TextField {...startProps} fullWidth />
                    <Box sx={{ mx: 2 }}> to </Box>
                    <TextField {...endProps} fullWidth />
                  </>
                )}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Report'}
          </Button>
        </Box>
      </Paper>

      {renderReportData()}
    </Box>
  );
}
