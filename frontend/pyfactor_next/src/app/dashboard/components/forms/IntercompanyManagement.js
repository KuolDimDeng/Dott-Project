import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

const IntercompanyManagement = () => {
  const [value, setValue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [formData, setFormData] = useState({
    transaction_type: '',
    entity_from: '',
    entity_to: '',
    amount: '',
    currency: '',
    converted_amount: '',
    exchange_rate: '',
    date: '',
    document_reference: '',
    reconciliation_status: '',
    transfer_pricing: '',
    notes: '',
  });

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/intercompany-transactions/');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching intercompany transactions:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/intercompany-accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching intercompany accounts:', error);
    }
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTransaction) {
        await axiosInstance.put(
          `/api/finance/intercompany-transactions/${selectedTransaction.transaction_id}/`,
          formData
        );
      } else {
        await axiosInstance.post('/api/finance/intercompany-transactions/', formData);
      }
      fetchTransactions();
      setFormData({
        transaction_type: '',
        entity_from: '',
        entity_to: '',
        amount: '',
        currency: '',
        converted_amount: '',
        exchange_rate: '',
        date: '',
        document_reference: '',
        reconciliation_status: '',
        transfer_pricing: '',
        notes: '',
      });
      setSelectedTransaction(null);
      setValue(1); // Switch to the List tab
    } catch (error) {
      console.error('Error saving intercompany transaction:', error);
    }
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setFormData(transaction);
    setValue(0); // Switch to the Create/Edit tab
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await axiosInstance.delete(`/api/finance/intercompany-transactions/${id}/`);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting intercompany transaction:', error);
      }
    }
  };

  const renderTransactionVolumeChart = () => {
    const data = {
      labels: ['Sales', 'Purchases', 'Loans', 'Asset Transfers', 'Services', 'Cost Allocations'],
      datasets: [
        {
          label: 'Transaction Volume',
          data: [
            transactions.filter((t) => t.transaction_type === 'sale').length,
            transactions.filter((t) => t.transaction_type === 'purchase').length,
            transactions.filter((t) => t.transaction_type === 'loan').length,
            transactions.filter((t) => t.transaction_type === 'asset_transfer').length,
            transactions.filter((t) => t.transaction_type === 'service').length,
            transactions.filter((t) => t.transaction_type === 'cost_allocation').length,
          ],
          backgroundColor: 'rgba(75,192,192,0.6)',
        },
      ],
    };

    const options = {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Transactions',
          },
        },
      },
    };

    return <Bar data={data} options={options} />;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="intercompany management tabs">
          <Tab label="Create/Edit Transaction" />
          <Tab label="Transaction List" />
          <Tab label="Transaction Analysis" />
          <Tab label="Account Balances" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <form onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Transaction Type</InputLabel>
            <Select
              name="transaction_type"
              value={formData.transaction_type}
              onChange={handleInputChange}
            >
              <MenuItem value="sale">Sale</MenuItem>
              <MenuItem value="purchase">Purchase</MenuItem>
              <MenuItem value="loan">Loan</MenuItem>
              <MenuItem value="asset_transfer">Asset Transfer</MenuItem>
              <MenuItem value="service">Service</MenuItem>
              <MenuItem value="cost_allocation">Cost Allocation</MenuItem>
            </Select>
          </FormControl>
          <TextField
            name="entity_from"
            label="From Entity"
            value={formData.entity_from}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="entity_to"
            label="To Entity"
            value={formData.entity_to}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="amount"
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="currency"
            label="Currency"
            value={formData.currency}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="converted_amount"
            label="Converted Amount"
            type="number"
            value={formData.converted_amount}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="exchange_rate"
            label="Exchange Rate"
            type="number"
            value={formData.exchange_rate}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="date"
            label="Date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            name="document_reference"
            label="Document Reference"
            value={formData.document_reference}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Reconciliation Status</InputLabel>
            <Select
              name="reconciliation_status"
              value={formData.reconciliation_status}
              onChange={handleInputChange}
            >
              <MenuItem value="unmatched">Unmatched</MenuItem>
              <MenuItem value="matched">Matched</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>
          <TextField
            name="transfer_pricing"
            label="Transfer Pricing"
            value={formData.transfer_pricing}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            name="notes"
            label="Notes"
            value={formData.notes}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            multiline
            rows={4}
          />
          <Button type="submit" variant="contained" color="primary">
            {selectedTransaction ? 'Update Transaction' : 'Create Transaction'}
          </Button>
        </form>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.transaction_id}>
                  <TableCell>{transaction.transaction_id}</TableCell>
                  <TableCell>{transaction.transaction_type}</TableCell>
                  <TableCell>{transaction.entity_from}</TableCell>
                  <TableCell>{transaction.entity_to}</TableCell>
                  <TableCell>{`${transaction.amount} ${transaction.currency}`}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.reconciliation_status}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleEdit(transaction)}>Edit</Button>
                    <Button onClick={() => handleDelete(transaction.transaction_id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Typography variant="h6" gutterBottom>
          Transaction Volume by Type
        </Typography>
        {renderTransactionVolumeChart()}
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Typography variant="h6" gutterBottom>
          Intercompany Account Balances
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account Name</TableCell>
                <TableCell>Account Type</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.account_type}</TableCell>
                  <TableCell>{account.entity}</TableCell>
                  <TableCell>{account.balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );
};

export default IntercompanyManagement;
