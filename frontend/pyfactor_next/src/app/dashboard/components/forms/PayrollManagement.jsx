import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../components/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import { format } from 'date-fns';

const PayrollManagement = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [accountingPeriod, setAccountingPeriod] = useState('');
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedRunTransactions, setSelectedRunTransactions] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    fetchPayrollRuns();
    fetchConnectedAccounts();
    fetchEmployees();
  }, []);

  useEffect(() => {
    console.log('Selected Account:', selectedAccount);
    console.log('Accounting Period:', accountingPeriod);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Button should be enabled:', Boolean(selectedAccount && ((accountingPeriod) || (startDate && endDate))));
  }, [selectedAccount, accountingPeriod, startDate, endDate]);

  useEffect(() => {
    console.log('Confirm dialog open state:', openConfirmDialog);
  }, [openConfirmDialog]);

  const fetchPayrollRuns = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/runs/');
      setPayrollRuns(response.data);
      addMessage('info', 'Payroll runs fetched successfully');
    } catch (error) {
      addMessage('error', 'Error fetching payroll runs');
      console.error('Error fetching payroll runs:', error);
    }
  };

  const fetchConnectedAccounts = async () => {
    try {
      console.log('Fetching connected accounts...');
      const response = await axiosInstance.get('/api/banking/accounts/');
      console.log('Connected accounts response:', response);
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setConnectedAccounts(response.data.accounts);
      } else {
        console.log('No connected accounts found or invalid data structure');
        addMessage('info', 'No connected bank accounts found');
        setConnectedAccounts([]);
      }
    } catch (error) {
      addMessage('error', 'Error fetching connected accounts');
      console.error('Error fetching connected accounts:', error);
      setConnectedAccounts([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get('/api/hr/employees/');
      const employeesWithLastPayPeriod = response.data.map(employee => ({
        ...employee,
        lastPayPeriod: employee.lastPayPeriod || 'N/A'
      }));
      setEmployees(employeesWithLastPayPeriod);
    } catch (error) {
      addMessage('error', 'Error fetching employees');
      console.error('Error fetching employees:', error);
    }
  };

  const handleRunPayroll = async () => {
    console.log('handleRunPayroll called');
    console.log('Selected Account:', selectedAccount);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Accounting Period:', accountingPeriod);
    console.log('Selected Employees:', selectedEmployees);

    setLoading(true);
    try {
      console.log('Sending payroll calculation request...');
      const response = await axiosInstance.post('/api/payroll/calculate/', {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        accounting_period: accountingPeriod,
        account_id: selectedAccount,
        employee_ids: selectedEmployees,
      });
      console.log('Payroll calculation response:', response.data);
      setPayrollSummary(response.data);
      setOpenConfirmDialog(true);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      console.error('Error response:', error.response);
      addMessage('error', `Error calculating payroll: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmRunPayroll = async () => {
    setLoading(true);
    try {
      await axiosInstance.post('/api/payroll/run/', {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        accounting_period: accountingPeriod,
        account_id: selectedAccount,
        employee_ids: selectedEmployees,
      });
      fetchPayrollRuns();
      setOpenConfirmDialog(false);
      addMessage('success', 'Payroll run successfully');
    } catch (error) {
      addMessage('error', 'Error running payroll');
      console.error('Error running payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransactions = async (runId) => {
    try {
      const response = await axiosInstance.get(`/api/payroll/transactions/${runId}/`);
      setSelectedRunTransactions(response.data);
    } catch (error) {
      console.error('Error fetching payroll transactions:', error);
    }
  };

  const getAccountingPeriods = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const periods = [];
    for (let i = 0; i < 12; i++) {
      periods.unshift(`${currentYear}-${String(i + 1).padStart(2, '0')}`);
    }
    return periods;
  };

  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => {
      const newSelection = prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId];
      setSelectAll(newSelection.length === employees.length);
      return newSelection;
    });
  };

  const handleDateChange = (date, type) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    setAccountingPeriod('');
  };

  const handleAccountingPeriodChange = (event) => {
    setAccountingPeriod(event.target.value);
    setStartDate(null);
    setEndDate(null);
  };

  const handleSelectAll = (event) => {
    setSelectAll(event.target.checked);
    if (event.target.checked) {
      setSelectedEmployees(employees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Payroll Management
        </Typography>
        
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Connected Bank Accounts</Typography>
          <Grid container spacing={2}>
            {connectedAccounts.map((account) => (
              <Grid item xs={12} sm={6} md={4} key={account.account_id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{account.name}</Typography>
                    <Typography>Balance: ${account.balances?.current?.toFixed(2) || 'N/A'}</Typography>
                    <Typography>Account Type: {account.type || 'N/A'}</Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedAccount === account.account_id}
                          onChange={() => setSelectedAccount(account.account_id)}
                        />
                      }
                      label="Select for Payroll"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {selectedAccount && (
          <Box mb={3}>
            <Typography variant="body1" color="primary" gutterBottom>
              The selected account ({connectedAccounts.find(a => a.account_id === selectedAccount)?.name}) 
              will be used to fund this payroll run.
            </Typography>
          </Box>
        )}
        
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Run Payroll</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Accounting Period</InputLabel>
            <Select
              value={accountingPeriod}
              onChange={handleAccountingPeriodChange}
              disabled={startDate || endDate}
            >
              {getAccountingPeriods().map((period) => (
                <MenuItem key={period} value={period}>{period}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(date) => handleDateChange(date, 'start')}
            renderInput={(params) => <TextField {...params} />}
            disabled={!!accountingPeriod}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(date) => handleDateChange(date, 'end')}
            renderInput={(params) => <TextField {...params} sx={{ ml: 2 }} />}
            disabled={!!accountingPeriod}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleRunPayroll}
            sx={{ ml: 2 }}
            disabled={!selectedAccount || (!accountingPeriod && (!startDate || !endDate)) || loading || selectedEmployees.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : 'Run Payroll'}
          </Button>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Employee Summary</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectAll}
                onChange={handleSelectAll}
                indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < employees.length}
              />
            }
            label="Select All"
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Salary</TableCell>
                  <TableCell>Last Pay Period</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleEmployeeSelection(employee.id)}
                      />
                    </TableCell>
                    <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                    <TableCell>{employee.department || 'N/A'}</TableCell>
                    <TableCell>{employee.job_title || 'N/A'}</TableCell>
                    <TableCell>
                      {employee.salary 
                        ? `$${Number(employee.salary).toFixed(2)}` 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{employee.lastPayPeriod}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Payroll Runs</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Run Date</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payrollRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{new Date(run.run_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(run.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(run.end_date).toLocaleDateString()}</TableCell>
                    <TableCell>{run.status}</TableCell>
                    <TableCell>
                      <Button onClick={() => handleViewTransactions(run.id)}>View Transactions</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {selectedRunTransactions.length > 0 && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>Payroll Transactions</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Gross Pay</TableCell>
                    <TableCell>Taxes</TableCell>
                    <TableCell>Net Pay</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedRunTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.employee}</TableCell>
                      <TableCell>${transaction.gross_pay.toFixed(2)}</TableCell>
                      <TableCell>${transaction.taxes.toFixed(2)}</TableCell>
                      <TableCell>${transaction.net_pay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
          <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle>Confirm Payroll Run</DialogTitle>
        <DialogContent>
          <Typography>Total Payroll: ${payrollSummary?.total.toFixed(2)}</Typography>
          <Typography>Bank Account: {connectedAccounts.find(a => a.account_id === selectedAccount)?.name}</Typography>
          <Typography>Period: {accountingPeriod || `${startDate?.toLocaleDateString()} - ${endDate?.toLocaleDateString()}`}</Typography>
          <Typography>Number of Employees: {selectedEmployees.length}</Typography>
          <Typography>Would you like to continue?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="error">
            No
          </Button>
          <Button onClick={confirmRunPayroll} color="primary" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default PayrollManagement;