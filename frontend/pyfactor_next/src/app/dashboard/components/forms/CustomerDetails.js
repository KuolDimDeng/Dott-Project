import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, Typography, Paper, Grid, Tabs, Tab, 
  Button, TextField, Table, TableBody, TableCell, Link,
  TableContainer, TableHead, TableRow, Avatar, IconButton,
  CircularProgress
} from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InvoiceDetails from './InvoiceDetails';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';

const CustomerDetails = ({ customerId, onBackToList, onInvoiceSelect }) => {
  const [customer, setCustomer] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [userDatabase, setUserDatabase] = useState(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.log('User profile:', response.data);
      logger.log('User database:', response.data.database_name);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      setError('Failed to load user profile');
    }
  }, []);

  const fetchCustomer = useCallback(async () => {
    if (!customerId || !userDatabase) {
      logger.error("Customer ID or User Database is not provided", { customerId, userDatabase });
      setError("Customer ID or User Database is not provided");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      logger.info(`Fetching customer data for ID: ${customerId}`);
      const response = await axiosInstance.get(`/api/customers/${customerId}/`);
      logger.info('Customer data received:', response.data);
      setCustomer(response.data);
    } catch (error) {
      logger.error('Error fetching customer:', error);
      setError('Failed to fetch customer data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, userDatabase]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (customerId && userDatabase) {
      fetchCustomer();
    }
  }, [customerId, userDatabase, fetchCustomer]);


  const fetchInvoices = useCallback(async () => {
    if (!customer) return;
    setIsLoading(true);
    setError(null);
    try {
      logger.info('Fetching invoices for customer:', customer.id);
      const response = await axiosInstance.get(`/api/customers/${customer.id}/invoices/`);
      setInvoices(response.data);
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      setError('Failed to fetch invoices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [customer]);

  const fetchTransactions = useCallback(async () => {
    if (!customer) return;
    setIsLoading(true);
    setError(null);
    try {
      logger.info('Fetching transactions for customer:', customer.id);
      const response = await axiosInstance.get(`/api/customers/${customer.id}/transactions/`);
      setTransactions(response.data);
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (customer) {
      if (tabValue === 1) fetchInvoices();
      if (tabValue === 2) fetchTransactions();
    }
  }, [tabValue, customer, fetchInvoices, fetchTransactions]);

  const handleEdit = () => {
    // Implement edit functionality
    logger.info('Edit customer:', customer.id);
  };

  const handleDelete = () => {
    // Implement delete functionality
    logger.info('Delete customer:', customer.id);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleInvoiceSelect = (invoiceId) => {
    logger.info('Selected invoice:', invoiceId);
    setSelectedInvoice(invoiceId);
    onInvoiceSelect(invoiceId);
  };

  const handleBackToCustomerDetails = () => {
    logger.info('Back to customer details');
    setSelectedInvoice(null);
  };

  const renderDetailsTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Basic Information</Typography>
          <TextField fullWidth label="Customer Name" value={customer.customerName || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="First Name" value={customer.first_name || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Last Name" value={customer.last_name || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Email" value={customer.email || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Phone" value={customer.phone || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Account Number" value={customer.accountNumber || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField 
            fullWidth 
            label="Website" 
            value={customer.website || ''} 
            margin="normal" 
            InputProps={{ 
              readOnly: true,
              endAdornment: customer.website && (
                <Link href={customer.website} target="_blank" rel="noopener noreferrer">
                  Visit
                </Link>
              )
            }} 
          />
          <TextField fullWidth label="Currency" value={customer.currency || ''} margin="normal" InputProps={{ readOnly: true }} />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Billing Address</Typography>
          <TextField fullWidth label="Street" value={customer.street || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="City" value={customer.city || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="State" value={customer.billingState || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Postcode" value={customer.postcode || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Country" value={customer.billingCountry || ''} margin="normal" InputProps={{ readOnly: true }} />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Shipping Information</Typography>
          <TextField fullWidth label="Ship To Name" value={customer.shipToName || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Shipping Country" value={customer.shippingCountry || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Shipping State" value={customer.shippingState || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Shipping Phone" value={customer.shippingPhone || ''} margin="normal" InputProps={{ readOnly: true }} />
          <TextField 
            fullWidth 
            label="Delivery Instructions" 
            value={customer.deliveryInstructions || ''} 
            margin="normal" 
            multiline 
            rows={3}
            InputProps={{ readOnly: true }} 
          />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Additional Information</Typography>
          <TextField 
            fullWidth 
            label="Notes" 
            value={customer.notes || ''} 
            margin="normal" 
            multiline 
            rows={4}
            InputProps={{ readOnly: true }} 
          />
          <TextField 
            fullWidth 
            label="Created At" 
            value={new Date(customer.created_at).toLocaleString()} 
            margin="normal" 
            InputProps={{ readOnly: true }} 
          />
          <TextField 
            fullWidth 
            label="Updated At" 
            value={new Date(customer.updated_at).toLocaleString()} 
            margin="normal" 
            InputProps={{ readOnly: true }} 
          />
        </Paper>
      </Grid>
    </Grid>
  );

  const renderInvoicesTab = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Invoice Number</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Due Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow 
              key={invoice.id}
              onClick={() => handleInvoiceSelect(invoice.id)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { 
                  backgroundColor: 'rgba(0, 0, 128, 0.04)',
                },
                '&:hover .MuiTableCell-root': {
                  color: 'primary.main',
                },
              }}
            >
              {console.log('Invoice ID:', invoice.id)}
              <TableCell>{invoice.invoice_num}</TableCell>
              <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
              <TableCell>${invoice.amount}</TableCell>
              <TableCell>{invoice.status}</TableCell>
              <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderTransactionsTab = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>${transaction.amount}</TableCell>
              <TableCell>{transaction.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return (
      <Box>
        <Typography color="error">{error}</Typography>
        <Button onClick={onBackToList}>Back to Customer List</Button>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box>
        <Typography>No customer data available.</Typography>
        <IconButton onClick={onBackToList}>
          <ArrowBackIcon />
        </IconButton>
      </Box>
    );
  }

  if (selectedInvoice) {
    return (
      <Box>
        <Button
          onClick={handleBackToCustomerDetails}
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          sx={{
            mr: 1,
            mb: 2,
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
            },
          }}
        >
          Back to Customer Details
        </Button>
        <InvoiceDetails 
          invoiceId={selectedInvoice} 
          onBackToCustomerDetails={handleBackToCustomerDetails} 
        />
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ p: 3 }}>
        <Button
          onClick={onBackToList}
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          sx={{
            mr: 1,
            mb: 2,
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
            },
          }}
        >
          Back to Customer List
        </Button>
        <Typography variant="h4" gutterBottom>
          Customer Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ width: 60, height: 60, mr: 2 }}>
                  <PersonIcon fontSize="large" />
                </Avatar>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                <IconButton sx={{ ml: 'auto' }} onClick={handleEdit}>
                  <EditIcon />
                </IconButton>
              </Box>
              <Typography>Name: {customer.customerName || `${customer.first_name} ${customer.last_name}`}</Typography>
              <Typography>Email: {customer.email}</Typography>
              <Typography>Phone: {customer.phone}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Actions</Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleEdit}
                startIcon={<EditIcon />}
                sx={{
                  mr: 1,
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                  },
                }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                startIcon={<DeleteIcon />}
                sx={{
                  mr: 1,
                  '&:hover': {
                    backgroundColor: 'error.main',
                    color: 'white',
                  },
                }}
              >
                Delete
              </Button>
            </Paper>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Details" />
            <Tab label="Invoices" />
            <Tab label="Transactions" />
          </Tabs>
        </Box>
        <Box sx={{ mt: 2 }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <>
              {tabValue === 0 && renderDetailsTab()}
              {tabValue === 1 && renderInvoicesTab()}
              {tabValue === 2 && renderTransactionsTab()}
            </>
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

CustomerDetails.propTypes = {
  customerId: PropTypes.string.isRequired,
  onBackToList: PropTypes.func.isRequired,
  onInvoiceSelect: PropTypes.func.isRequired,
};

export default CustomerDetails;