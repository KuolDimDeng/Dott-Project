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
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Toolbar,
  InputAdornment,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  useTheme,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { axiosInstance } from '@/lib/axiosConfig';

const AccountReconManagement = () => {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const [formData, setFormData] = useState({
    bank_account: '',
    reconciliation_date: null,
    statement_balance: '',
    book_balance: '',
  });

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/finance/reconciliations/');
      setReconciliations(response.data);
    } catch (error) {
      console.error('Failed to fetch reconciliations', error);
    }
    setLoading(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, reconciliation_date: date });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await axiosInstance.post('/api/finance/reconciliations/', formData);
      console.log('Reconciliation created successfully');
      setFormData({
        bank_account: '',
        reconciliation_date: null,
        statement_balance: '',
        book_balance: '',
      });
      fetchReconciliations();
    } catch (error) {
      console.error('Failed to create reconciliation', error);
    }
  };

  const handleReconcile = (id) => {
    // Implement reconciliation logic here
    console.info('Reconciliation feature not implemented yet');
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom>
        Account Reconciliation
      </Typography>
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            name="bank_account"
            label="Bank Account ID"
            value={formData.bank_account}
            onChange={handleInputChange}
            required
          />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Reconciliation Date"
              value={formData.reconciliation_date}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} required />}
            />
          </LocalizationProvider>
          <TextField
            name="statement_balance"
            label="Statement Balance"
            type="number"
            value={formData.statement_balance}
            onChange={handleInputChange}
            required
          />
          <TextField
            name="book_balance"
            label="Book Balance"
            type="number"
            value={formData.book_balance}
            onChange={handleInputChange}
            required
          />
          <Button type="submit" variant="contained" color="primary">
            Create Reconciliation
          </Button>
        </Box>
      </Paper>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Bank Account</TableCell>
              <TableCell>Reconciliation Date</TableCell>
              <TableCell>Statement Balance</TableCell>
              <TableCell>Book Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reconciliations.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.bank_account.account_number}</TableCell>
                <TableCell>{row.reconciliation_date}</TableCell>
                <TableCell>{row.statement_balance}</TableCell>
                <TableCell>{row.book_balance}</TableCell>
                <TableCell>{row.is_reconciled ? 'Reconciled' : 'Pending'}</TableCell>
                <TableCell>
                  <Button onClick={() => handleReconcile(row.id)}>Reconcile</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AccountReconManagement;
