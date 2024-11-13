import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, Typography, Paper, Grid, Tabs, Tab, 
  Button, TextField, Table, TableBody, TableCell, Link,
  TableContainer, TableHead, TableRow, Avatar, IconButton,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import axiosInstance from '@/lib/axiosConfig';;
import { logger } from '@/utils/logger';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    logger.info('Edit customer:', customer.id);
    setIsEditing(true);
    setEditedCustomer({...customer});
  };

  const handleCancelEdit = () => {
    logger.info('Cancel edit customer:', customer.id);
    setIsEditing(false);
    setEditedCustomer(null);
  }

  const handleSaveEdit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.patch(`/api/customers/${customer.id}/update/`, editedCustomer);
      setCustomer(response.data);
      setIsEditing(false);
      setEditedCustomer(null);
      logger.info('Customer updated successfully');
    } catch (error) {
      logger.error('Error updating customer:', error);
      setError('Failed to update customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const handleDelete = () => {
    // Implement delete functionality
    logger.info('Delete customer:', customer.id);
    setDeleteDialogOpen(true);
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

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axiosInstance.delete(`/api/customers/${customer.id}/delete`);
      logger.info('Customer deleted successfully');
      onBackToList();
    } catch (error) {
      logger.error('Error deleting customer:', error);
      setError('Failed to delete customer. Please try again.');
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const renderDetailsTab = () => {
    const handleInputChange = (event) => {
      const { name, value } = event.target;
      setEditedCustomer({ ...editedCustomer, [name]: value });
    };
  
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <TextField
              fullWidth
              label="Customer Name"
              name="customerName"
              value={isEditing ? editedCustomer.customerName || '' : customer.customerName || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="First Name"
              name="first_name"
              value={isEditing ? editedCustomer.first_name || '' : customer.first_name || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Last Name"
              name="last_name"
              value={isEditing ? editedCustomer.last_name || '' : customer.last_name || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={isEditing ? editedCustomer.email || '' : customer.email || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={isEditing ? editedCustomer.phone || '' : customer.phone || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Account Number"
              value={customer.accountNumber || ''}
              margin="normal"
              InputProps={{ readOnly: true }}
            />
            <TextField 
              fullWidth 
              label="Website" 
              name="website"
              value={isEditing ? editedCustomer.website || '' : customer.website || ''} 
              onChange={handleInputChange}
              margin="normal" 
              InputProps={{ 
                readOnly: !isEditing,
                endAdornment: customer.website && !isEditing && (
                  <Link href={customer.website} target="_blank" rel="noopener noreferrer">
                    Visit
                  </Link>
                )
              }} 
            />
            <TextField
              fullWidth
              label="Currency"
              name="currency"
              value={isEditing ? editedCustomer.currency || '' : customer.currency || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Billing Address</Typography>
            <TextField
              fullWidth
              label="Street"
              name="street"
              value={isEditing ? editedCustomer.street || '' : customer.street || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="City"
              name="city"
              value={isEditing ? editedCustomer.city || '' : customer.city || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="State"
              name="billingState"
              value={isEditing ? editedCustomer.billingState || '' : customer.billingState || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Postcode"
              name="postcode"
              value={isEditing ? editedCustomer.postcode || '' : customer.postcode || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Country"
              name="billingCountry"
              value={isEditing ? editedCustomer.billingCountry || '' : customer.billingCountry || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Shipping Information</Typography>
            <TextField
              fullWidth
              label="Ship To Name"
              name="shipToName"
              value={isEditing ? editedCustomer.shipToName || '' : customer.shipToName || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Shipping Country"
              name="shippingCountry"
              value={isEditing ? editedCustomer.shippingCountry || '' : customer.shippingCountry || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Shipping State"
              name="shippingState"
              value={isEditing ? editedCustomer.shippingState || '' : customer.shippingState || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField
              fullWidth
              label="Shipping Phone"
              name="shippingPhone"
              value={isEditing ? editedCustomer.shippingPhone || '' : customer.shippingPhone || ''}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
            <TextField 
              fullWidth 
              label="Delivery Instructions" 
              name="deliveryInstructions"
              value={isEditing ? editedCustomer.deliveryInstructions || '' : customer.deliveryInstructions || ''} 
              onChange={handleInputChange}
              margin="normal" 
              multiline 
              rows={3}
              InputProps={{ readOnly: !isEditing }} 
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Additional Information</Typography>
            <TextField 
              fullWidth 
              label="Notes" 
              name="notes"
              value={isEditing ? editedCustomer.notes || '' : customer.notes || ''} 
              onChange={handleInputChange}
              margin="normal" 
              multiline 
              rows={4}
              InputProps={{ readOnly: !isEditing }} 
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
  };

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
                {!isEditing && (
                  <IconButton sx={{ ml: 'auto' }} onClick={handleEdit}>
                    <EditIcon />
                  </IconButton>
                )}
              </Box>
              <Typography>Name: {customer.customerName || `${customer.first_name} ${customer.last_name}`}</Typography>
              <Typography>Email: {customer.email}</Typography>
              <Typography>Phone: {customer.phone}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Actions</Typography>
              {isEditing ? (
                <>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleSaveEdit}
                    startIcon={<SaveIcon />}
                    sx={{
                      mr: 1,
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                      },
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleCancelEdit}
                    startIcon={<CancelIcon />}
                    sx={{
                      mr: 1,
                      '&:hover': {
                        backgroundColor: 'secondary.main',
                        color: 'white',
                      },
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
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
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this customer?
            <br />
            Name: {customer?.customerName || `${customer?.first_name} ${customer?.last_name}`}
            <br />
            Email: {customer?.email}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ErrorBoundary>
  );
};

CustomerDetails.propTypes = {
  customerId: PropTypes.string.isRequired,
  onBackToList: PropTypes.func.isRequired,
  onInvoiceSelect: PropTypes.func.isRequired,
};

export default CustomerDetails;