import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Button,
  Grid,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '@/lib/axiosConfig';;

const PayrollReport = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    payPeriod: '',
    department: '',
    employeeType: '',
  });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axiosInstance.get('/api/departments/');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchPayrollData = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/report/', {
        params: {
          ...filters,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
      });
      setPayrollData(response.data);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleGenerateReport = () => {
    fetchPayrollData();
  };

  const handleExport = (format) => {
    // Implement export functionality (PDF or CSV)
    console.log(`Exporting report as ${format}`);
  };

  const calculateTotals = () => {
    return payrollData.reduce(
      (totals, employee) => ({
        grossPay: totals.grossPay + employee.grossPay,
        deductions: totals.deductions + employee.deductions,
        netPay: totals.netPay + employee.netPay,
        ytdGross: totals.ytdGross + employee.ytdGross,
        ytdDeductions: totals.ytdDeductions + employee.ytdDeductions,
        ytdNet: totals.ytdNet + employee.ytdNet,
      }),
      { grossPay: 0, deductions: 0, netPay: 0, ytdGross: 0, ytdDeductions: 0, ytdNet: 0 }
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Payroll Report
        </Typography>

        {/* Filters and Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Select
                fullWidth
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                displayEmpty
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Select
                fullWidth
                name="employeeType"
                value={filters.employeeType}
                onChange={handleFilterChange}
                displayEmpty
              >
                <MenuItem value="">All Employee Types</MenuItem>
                <MenuItem value="fullTime">Full-Time</MenuItem>
                <MenuItem value="partTime">Part-Time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button variant="contained" color="primary" onClick={handleGenerateReport} fullWidth>
                Generate Report
              </Button>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => handleExport('PDF')} sx={{ mr: 1 }}>
              Export PDF
            </Button>
            <Button variant="outlined" onClick={() => handleExport('CSV')}>
              Export CSV
            </Button>
          </Box>
        </Paper>

        {/* Main Payroll Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee Name</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell align="right">Gross Pay</TableCell>
                <TableCell align="right">Deductions</TableCell>
                <TableCell align="right">Net Pay</TableCell>
                <TableCell align="right">YTD Gross</TableCell>
                <TableCell align="right">YTD Deductions</TableCell>
                <TableCell align="right">YTD Net</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payrollData.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.employeeId}</TableCell>
                  <TableCell align="right">${employee.grossPay.toFixed(2)}</TableCell>
                  <TableCell align="right">${employee.deductions.toFixed(2)}</TableCell>
                  <TableCell align="right">${employee.netPay.toFixed(2)}</TableCell>
                  <TableCell align="right">${employee.ytdGross.toFixed(2)}</TableCell>
                  <TableCell align="right">${employee.ytdDeductions.toFixed(2)}</TableCell>
                  <TableCell align="right">${employee.ytdNet.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary Totals */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Summary Totals
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(calculateTotals()).map(([key, value]) => (
              <Grid item xs={6} sm={4} key={key}>
                <Typography>
                  {key.charAt(0).toUpperCase() + key.slice(1)}: ${value.toFixed(2)}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default PayrollReport;