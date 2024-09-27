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
  RadioGroup,
  Radio,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../components/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import { format, addDays, addWeeks } from 'date-fns';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const PayrollManagement = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [accountingPeriod, setAccountingPeriod] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const { addMessage } = useUserMessageContext();
  const [lastPayPeriod, setLastPayPeriod] = useState(null);
  const [nextPayPeriod, setNextPayPeriod] = useState(null);
  const [payPeriodType, setPayPeriodType] = useState('monthly');
  const [biWeeklyStartDate, setBiWeeklyStartDate] = useState(null);
  const [scheduledPayrolls, setScheduledPayrolls] = useState([]);
  const theme = useTheme();


  useEffect(() => {
    fetchPayPeriods();
    fetchConnectedAccounts();
    fetchEmployees();
    fetchScheduledPayrolls();
  }, []);

  const fetchScheduledPayrolls = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/scheduled-runs/');
      setScheduledPayrolls(response.data);
    } catch (error) {
      addMessage('error', 'Error fetching scheduled payrolls');
      console.error('Error fetching scheduled payrolls:', error);
    }
  };

  const fetchPayPeriods = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/pay-periods/');
      setLastPayPeriod(response.data.last_pay_period);
      setNextPayPeriod(response.data.next_pay_period);
    } catch (error) {
      addMessage('error', 'Error fetching pay periods');
      console.error('Error fetching pay periods:', error);
    }
  };

  const fetchConnectedAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setConnectedAccounts(response.data.accounts);
      } else {
        addMessage('info', 'No connected bank accounts found');
        setConnectedAccounts([]);
      }
    } catch (error) {
      addMessage('error', 'Error fetching connected accounts');
      console.error('Error fetching connected accounts:', error);
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
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/payroll/calculate/', {
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        accounting_period: accountingPeriod,
        account_id: selectedAccount,
        employee_ids: selectedEmployees,
        pay_period_type: payPeriodType,
        bi_weekly_start_date: biWeeklyStartDate ? format(biWeeklyStartDate, 'yyyy-MM-dd') : null,
      });
      setPayrollSummary(response.data);
      setOpenConfirmDialog(true);
    } catch (error) {
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
        pay_period_type: payPeriodType,
        bi_weekly_start_date: biWeeklyStartDate ? format(biWeeklyStartDate, 'yyyy-MM-dd') : null,
      });
      setOpenConfirmDialog(false);
      addMessage('success', 'Payroll run successfully');
    } catch (error) {
      addMessage('error', 'Error running payroll');
      console.error('Error running payroll:', error);
    } finally {
      setLoading(false);
    }
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

  const handlePayPeriodTypeChange = (event) => {
    setPayPeriodType(event.target.value);
    setAccountingPeriod('');
    setStartDate(null);
    setEndDate(null);
    setBiWeeklyStartDate(null);
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AttachMoneyIcon sx={{ fontSize: 40, mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Payroll Management
          </Typography>
        </Box>
        <Typography variant="subtitle1" gutterBottom>
          Manage payroll and run payrolls for your company.
        </Typography>

        {/* Scheduled Payrolls Section */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Scheduled Payrolls</Typography>
          <Grid container spacing={2}>
            {scheduledPayrolls.map((payroll, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">{payroll.name}</Typography>
                    <Typography>Date: {new Date(payroll.date).toLocaleDateString()}</Typography>
                    <Typography>Employees: {payroll.employeeCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Connected Bank Accounts Section */}
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

        {/* Pay Period Selection */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Select Pay Period</Typography>
          <Typography variant="body2" gutterBottom>
            Choose either monthly, bi-weekly, or a custom date range for your pay period. You can only select one option.
          </Typography>
          <RadioGroup
            value={payPeriodType}
            onChange={handlePayPeriodTypeChange}
          >
            <FormControlLabel value="monthly" control={<Radio />} label="Monthly" />
            <FormControlLabel value="biweekly" control={<Radio />} label="Bi-weekly" />
            <FormControlLabel value="custom" control={<Radio />} label="Custom Date Range" />
          </RadioGroup>

          {payPeriodType === 'monthly' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Accounting Period</InputLabel>
              <Select
                value={accountingPeriod}
                onChange={handleAccountingPeriodChange}
              >
                {getAccountingPeriods().map((period) => (
                  <MenuItem key={period} value={period}>{period}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {payPeriodType === 'biweekly' && (
            <DatePicker
              label="Bi-weekly Start Date"
              value={biWeeklyStartDate}
              onChange={setBiWeeklyStartDate}
              renderInput={(params) => <TextField {...params} fullWidth sx={{ mt: 2 }} />}
            />
          )}

          {payPeriodType === 'custom' && (
            <Box sx={{ mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => handleDateChange(date, 'start')}
                renderInput={(params) => <TextField {...params} sx={{ mr: 2 }} />}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => handleDateChange(date, 'end')}
                renderInput={(params) => <TextField {...params} />}
              />
            </Box>
          )}
        </Box>

        {/* Employee Summary Section */}
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

        <Button
          variant="contained"
          color="primary"
          onClick={handleRunPayroll}
          sx={{ mt: 2 }}
          disabled={!selectedAccount || (!accountingPeriod && !biWeeklyStartDate && (!startDate || !endDate)) || loading || selectedEmployees.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : 'Run Payroll'}
        </Button>
          <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle>Confirm Payroll Run</DialogTitle>
        <DialogContent>
        <Typography>Total Payroll Amount: ${payrollSummary?.total_amount.toFixed(2)}</Typography>
            <Typography>Number of Employees: {payrollSummary?.employee_count}</Typography>
            <Typography>Pay Period: {payrollSummary?.pay_period}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
            <Button onClick={confirmRunPayroll} color="primary" autoFocus>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PayrollManagement;