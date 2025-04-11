import React, { useState, useEffect, useCallback, Fragment } from 'react';
import PropTypes from 'prop-types';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import InvoiceDetails from './InvoiceDetails';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const CustomerDetails = ({ customerId, onBackToList, onInvoiceSelect, newCustomer = false }) => {
  const [customer, setCustomer] = useState(null);
  const [tabValue, setTabValue] = useState(newCustomer ? 0 : 0);
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(!newCustomer);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [userDatabase, setUserDatabase] = useState(null);
  const [isEditing, setIsEditing] = useState(newCustomer);
  const [editedCustomer, setEditedCustomer] = useState(newCustomer ? {
    customerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    notes: ''
  } : null);
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
      logger.error('Customer ID or User Database is not provided', { customerId, userDatabase });
      setError('Customer ID or User Database is not provided');
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
    if (customerId && userDatabase && !newCustomer) {
      fetchCustomer();
    }
  }, [customerId, userDatabase, fetchCustomer, newCustomer]);

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
    setEditedCustomer({ ...customer });
  };

  const handleCancelEdit = () => {
    logger.info('Cancel edit customer:', customer.id);
    setIsEditing(false);
    setEditedCustomer(null);
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.patch(
        `/api/customers/${customer.id}/update/`,
        editedCustomer
      );
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

  const handleCreateCustomer = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/customers/create/', editedCustomer);
      logger.info('Customer created successfully:', response.data);
      setCustomer(response.data);
      setIsEditing(false);
      setEditedCustomer(null);
    } catch (error) {
      logger.error('Error creating customer:', error);
      setError('Failed to create customer. Please try again.');
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

    if (newCustomer) {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Create New Customer
              </Typography>
              <TextField
                fullWidth
                label="Customer Name"
                name="customerName"
                value={editedCustomer.customerName || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={editedCustomer.first_name || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={editedCustomer.last_name || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={editedCustomer.email || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={editedCustomer.phone || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Street"
                name="street"
                value={editedCustomer.street || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="City"
                name="city"
                value={editedCustomer.city || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="State"
                name="state"
                value={editedCustomer.state || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Postcode"
                name="postcode"
                value={editedCustomer.postcode || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={editedCustomer.country || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <Box mt={2}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleCreateCustomer}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Customer'}
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={onBackToList} 
                  sx={{ ml: 2 }}
                >
                  Cancel
                </Button>
              </Box>
              {error && (
                <Box mt={2}>
                  <Typography color="error">{error}</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      );
    }

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
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
                ),
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
            <Typography variant="h6" gutterBottom>
              Billing Address
            </Typography>
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
              value={
                isEditing ? editedCustomer.billingCountry || '' : customer.billingCountry || ''
              }
              onChange={handleInputChange}
              margin="normal"
              InputProps={{ readOnly: !isEditing }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Shipping Information
            </Typography>
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
              value={
                isEditing ? editedCustomer.shippingCountry || '' : customer.shippingCountry || ''
              }
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
              value={
                isEditing
                  ? editedCustomer.deliveryInstructions || ''
                  : customer.deliveryInstructions || ''
              }
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
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
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
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice Number
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr 
                key={invoice.id} 
                onClick={() => handleInvoiceSelect(invoice.id)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                {console.log('Invoice ID:', invoice.id)}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.invoice_num}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invoice.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${invoice.amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    invoice.status === 'Paid' 
                      ? 'bg-green-100 text-green-800' 
                      : invoice.status === 'Overdue' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTransactionsTab = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(transaction.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={transaction.type === 'Credit' ? 'text-green-600' : 'text-red-600'}>
                    ${transaction.amount}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    transaction.type === 'Credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {transaction.type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading && !newCustomer) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !newCustomer) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={onBackToList} 
          className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to List
        </button>
      </div>
    );
  }

  if (!customer && !newCustomer) {
    return (
      <div className="p-6">
        <p className="text-gray-600 mb-4">No customer data found</p>
        <button 
          onClick={onBackToList} 
          className="flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to List
        </button>
      </div>
    );
  }

  if (selectedInvoice) {
    return (
      <ErrorBoundary FallbackComponent={() => <div>Error loading invoice details</div>}>
        <InvoiceDetails
          invoiceId={selectedInvoice}
          onBackToCustomerDetails={handleBackToCustomerDetails}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6">
        <button
          onClick={onBackToList}
          className="flex items-center mb-4 mr-4 border border-gray-300 text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Customer List
        </button>
        <h1 className="text-2xl font-bold mb-4">
          Customer Details
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-800">
                Basic Information
              </h2>
              {!isEditing && (
                <button 
                  onClick={handleEdit}
                  className="ml-auto text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Name:</span> {customer.customerName || `${customer.first_name} ${customer.last_name}`}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Email:</span> {customer.email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Phone:</span> {customer.phone}
              </p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Actions</h2>
            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button 
                onClick={(e) => handleTabChange(e, 0)} 
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
                  tabValue === 0 
                    ? 'text-blue-600 border-blue-600 bg-blue-50' 
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button 
                onClick={(e) => handleTabChange(e, 1)} 
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
                  tabValue === 1 
                    ? 'text-blue-600 border-blue-600 bg-blue-50' 
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Invoices
              </button>
              <button 
                onClick={(e) => handleTabChange(e, 2)} 
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out focus:outline-none ${
                  tabValue === 2 
                    ? 'text-blue-600 border-blue-600 bg-blue-50' 
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Transactions
              </button>
            </nav>
          </div>
        </div>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <p className="text-red-600 p-4">{error}</p>
          ) : (
            <>
              {tabValue === 0 && renderDetailsTab()}
              {tabValue === 1 && renderInvoicesTab()}
              {tabValue === 2 && renderTransactionsTab()}
            </>
          )}
        </div>
        {isEditing ? (
          <div className="mt-8 flex space-x-3">
            <button
              onClick={newCustomer ? handleCreateCustomer : handleSaveEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {newCustomer ? 'Create Customer' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-8 flex space-x-3">
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center px-4 py-2 border border-red-500 text-red-600 rounded hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            
            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Confirm Delete
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this customer?
                        <br />
                        Name: {customer?.customerName || `${customer?.first_name} ${customer?.last_name}`}
                        <br />
                        Email: {customer?.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

CustomerDetails.propTypes = {
  customerId: PropTypes.string,
  onBackToList: PropTypes.func,
  onInvoiceSelect: PropTypes.func,
  newCustomer: PropTypes.bool,
};

CustomerDetails.defaultProps = {
  customerId: '',
  onBackToList: () => {},
  onInvoiceSelect: () => {},
  newCustomer: false,
};

export default CustomerDetails;
