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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../components/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const PayrollManagement = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedRunTransactions, setSelectedRunTransactions] = useState([]);
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/runs/');
      setPayrollRuns(response.data);
      addMessage('info', 'Payroll fecthed successfully' )
    } catch (error) {
        addMessage('error', 'Error fecthing payroll runs')
      console.error('Error fetching payroll runs:', error);
    }
  };

  const handleRunPayroll = async () => {
    try {
      await axiosInstance.post('/api/payroll/run/', { start_date: startDate, end_date: endDate });
      fetchPayrollRuns();
      addMessage('info', 'Running Payroll...')
    } catch (error) {
      console.error('Error running payroll:', error);
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Payroll Management
        </Typography>
        
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Run Payroll</Typography>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            renderInput={(params) => <TextField {...params} />}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            renderInput={(params) => <TextField {...params} sx={{ ml: 2 }} />}
          />
          <Button variant="contained" color="primary" onClick={handleRunPayroll} sx={{ ml: 2 }}>
            Run Payroll
          </Button>
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
          <Box>
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
                      <TableCell>${transaction.gross_pay}</TableCell>
                      <TableCell>${transaction.taxes}</TableCell>
                      <TableCell>${transaction.net_pay}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default PayrollManagement;