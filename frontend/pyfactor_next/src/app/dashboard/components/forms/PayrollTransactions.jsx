///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/PayrollTransactions.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { axiosInstance } from '@/lib/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const PayrollTransactions = () => {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [archivedYears, setArchivedYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const { addMessage } = useUserMessageContext();
  const theme = useTheme();

  useEffect(() => {
    fetchPayrollRuns();
    fetchArchivedYears();
  }, [selectedYear]);

  const fetchPayrollRuns = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/runs/', {
        params: {
          year: selectedYear,
          start_date: startDate ? startDate.toISOString() : null,
          end_date: endDate ? endDate.toISOString() : null,
        },
      });
      setPayrollRuns(response.data);
    } catch (error) {
      addMessage('error', 'Error fetching payroll runs');
      console.error('Error fetching payroll runs:', error);
    }
  };

  const fetchArchivedYears = async () => {
    try {
      const response = await axiosInstance.get('/api/payroll/archived-years/');
      setArchivedYears(response.data);
    } catch (error) {
      addMessage('error', 'Error fetching archived years');
      console.error('Error fetching archived years:', error);
    }
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleApplyFilter = () => {
    fetchPayrollRuns();
  };

  const handleRowClick = async (runId) => {
    try {
      const response = await axiosInstance.get(`/api/payroll/runs/${runId}/`);
      setSelectedRun(response.data);
      setOpenDialog(true);
    } catch (error) {
      addMessage('error', 'Error fetching payroll run details');
      console.error('Error fetching payroll run details:', error);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Payroll Transactions
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Manage your payroll transactions.
        </Typography>

        <Box mb={3}>
          <Select value={selectedYear} onChange={handleYearChange} sx={{ mr: 2 }}>
            <MenuItem value={new Date().getFullYear()}>Current Year</MenuItem>
            {archivedYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            renderInput={(params) => <TextField {...params} sx={{ mr: 2 }} />}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            renderInput={(params) => <TextField {...params} sx={{ mr: 2 }} />}
          />
          <Button variant="contained" color="primary" onClick={handleApplyFilter}>
            Apply Filter
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Run Date</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payrollRuns.map((run) => (
                <TableRow key={run.id} onClick={() => handleRowClick(run.id)} hover>
                  <TableCell>{new Date(run.run_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(run.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(run.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>{run.status}</TableCell>
                  <TableCell>${run.total_amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Payroll Run Details</DialogTitle>
          <DialogContent>
            {selectedRun && (
              <Box>
                <Typography variant="h6">General Information</Typography>
                <Typography>
                  Run Date: {new Date(selectedRun.run_date).toLocaleDateString()}
                </Typography>
                <Typography>
                  Start Date: {new Date(selectedRun.start_date).toLocaleDateString()}
                </Typography>
                <Typography>
                  End Date: {new Date(selectedRun.end_date).toLocaleDateString()}
                </Typography>
                <Typography>Status: {selectedRun.status}</Typography>
                <Typography>Total Amount: ${selectedRun.total_amount.toFixed(2)}</Typography>

                <Typography variant="h6" mt={2}>
                  Employee Details
                </Typography>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Employee List</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Bank Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedRun.employees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell>{employee.name}</TableCell>
                            <TableCell>${employee.amount.toFixed(2)}</TableCell>
                            <TableCell>{employee.bank_details}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>

                <Typography variant="h6" mt={2}>
                  Notes
                </Typography>
                <Typography>{selectedRun.notes || 'No notes available.'}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PayrollTransactions;
