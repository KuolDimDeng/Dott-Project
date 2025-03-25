import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { toast } from 'react-toastify';
import InvoicePreview from './InvoicePreview';
import InvoiceTemplateBuilder from './InvoiceTemplateBuilder';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const InvoiceForm = () => {
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [logo, setLogo] = useState(null);
  const [accentColor, setAccentColor] = useState('#000000');
  const [template, setTemplate] = useState('Contemporary');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
  });
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [userDatabase, setUserDatabase] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchCustomers(userDatabase);
      fetchProducts(userDatabase);
      fetchServices(userDatabase);
    }
  }, [userDatabase]);

  useEffect(() => {
    console.log('Selected customer state changed:', selectedCustomer);
  }, [selectedCustomer]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logger.error('Error fetching user profile:', error);
      toast.error('Failed to fetch user profile');
    }
  };

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      setCustomersError(null);
      console.log('Fetching customers from database:', userDatabase);
      const response = await axiosInstance.get('/api/customers/', {
        params: { database: userDatabase },
      });
      console.log('Fetched customers:', response.data);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.response) {
        console.error('Data:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        setCustomersError(
          `Failed to load customers. Server responded with status ${error.response.status}`
        );
      } else if (error.request) {
        console.error('Request:', error.request);
        setCustomersError('Failed to load customers. No response received from server.');
      } else {
        console.error('Error', error.message);
        setCustomersError(`Failed to load customers. ${error.message}`);
      }
      toast.error(`Failed to fetch customers: ${error.message}`);
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchProducts = async (database_name) => {
    try {
      console.log('Fetching products from database:', database_name);
      const response = await axiosInstance.get('/api/products/', {
        params: { database: database_name },
      });
      console.log('Fetched products:', response.data);
      setProducts(response.data);
    } catch (error) {
      logger.error('Error fetching products:', error);
    }
  };

  const fetchServices = async (database_name) => {
    try {
      console.log('Fetching services from database:', database_name);
      const response = await axiosInstance.get('/api/services/', {
        params: { database: database_name },
      });
      console.log('Fetched services:', response.data);
      setServices(response.data);
    } catch (error) {
      logger.error('Error fetching services:', error);
    }
  };

  const handleCustomerChange = (event) => {
    const selectedId = event.target.value;
    console.log('Selected customer ID:', selectedId);
    setSelectedCustomer(selectedId);

    const selectedCustomerData = customers.find((customer) => customer.id === selectedId);
    console.log('Selected customer data:', selectedCustomerData);

    if (selectedCustomerData) {
      setUserData({
        first_name: selectedCustomerData.first_name || '',
        last_name: selectedCustomerData.last_name || '',
        business_name: selectedCustomerData.customerName || '',
        address: selectedCustomerData.street || '',
        city: selectedCustomerData.city || '',
        state: selectedCustomerData.billingState || '',
        zip_code: selectedCustomerData.postcode || '',
        phone: selectedCustomerData.phone || '',
        email: selectedCustomerData.email || '',
      });
    } else {
      console.log('No customer found with id:', selectedId);
    }
  };

  const handleOpenTemplateBuilder = () => {
    const windowFeatures = 'width=800,height=600,resizable=yes,scrollbars=yes';
    const windowName = '_blank';
    const url = '/invoice-template-builder';
    window.open(url, windowName, windowFeatures);
  };

  const handleCloseTemplateBuilder = () => {
    setShowTemplateBuilder(false);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setLogo(URL.createObjectURL(file));
  };

  const handleAccentColorChange = (event) => {
    setAccentColor(event.target.value);
  };

  const handleTemplateChange = (event) => {
    setTemplate(event.target.value);
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { type: '', description: '', quantity: 1, unitPrice: 0, amount: 0 },
    ]);
  };

  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index][field] = value;

    if (field === 'productId' || field === 'serviceId') {
      const selectedItem =
        field === 'productId'
          ? products.find((product) => product.id === value)
          : services.find((service) => service.id === value);

      if (selectedItem && selectedItem.price) {
        updatedItems[index].unitPrice = parseFloat(selectedItem.price);
        updatedItems[index].amount = updatedItems[index].quantity * parseFloat(selectedItem.price);
      }
    }

    if (field === 'quantity') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setInvoiceItems(updatedItems);
  };

  const handleSave = async () => {
    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    const subtotal = invoiceItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    if (total <= 0) {
      toast.error('Invoice total must be greater than zero');
      return;
    }

    try {
      // Generate a unique invoice number
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}${month}${day}`;

      // Fetch the last invoice number from the server or local storage
      const lastInvoiceNumber = await getLastInvoiceNumber();
      let newInvoiceNumber;

      if (lastInvoiceNumber) {
        const lastNumber = parseInt(lastInvoiceNumber.replace(/\D/g, ''), 10);
        newInvoiceNumber = `INV${String(lastNumber + 1).padStart(5, '0')}`;
      } else {
        newInvoiceNumber = `INV00001`;
      }

      const formattedDate = currentDate.toISOString().split('T')[0]; // This will give you YYYY-MM-DD

      // Correct transaction data format
      const transactionData = {
        description: 'Invoice Transaction',
        account: 1, // Make sure this is a valid account ID
        type: 'credit',
        amount: total,
        notes: 'Automatically created for invoice',
        date: formattedDate, // Add the transaction date
      };

      const invoiceData = {
        invoice_num: newInvoiceNumber,
        customer: selectedCustomer,
        amount: total,
        due_date: formattedDate,
        status: 'draft',
        transaction: transactionData,
        date: formattedDate, // Add the invoice date
        items: invoiceItems.map((item) => ({
          product: item.productId,
          service: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          amount: item.amount,
        })),
      };

      // Save the new invoice number to the server or local storage
      await saveInvoiceNumber(newInvoiceNumber);
      console.log('Invoice data being sent to server:', invoiceData);
      const response = await axiosInstance.post('/api/invoices/create/', invoiceData);

      console.log('Invoice created successfully', response.data);
      toast.success('Invoice created successfully');
    } catch (error) {
      console.error('Error creating invoice:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      logger.error('Error creating invoice', error);
      toast.error(`Error creating invoice: ${error.message}`);
    }
  };

  // Function to fetch the last invoice number from the server or local storage
  const getLastInvoiceNumber = async () => {
    // Implement logic to fetch the last invoice number from the server or local storage
    // Return the last invoice number or null if not found
    return null; // Replace with your implementation
  };

  // Function to save the new invoice number to the server or local storage
  const saveInvoiceNumber = async (invoiceNumber) => {
    // Implement logic to save the new invoice number to the server or local storage
    // Return a promise or handle any necessary operations
  }; // Replace with your implementation

  const handleCancel = () => {
    // Reset form data or navigate to the previous page
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create Invoice
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="customer-select-label">Customer</InputLabel>
            <Select
              labelId="customer-select-label"
              id="customer-select"
              value={selectedCustomer}
              onChange={handleCustomerChange}
              label="Customer"
              error={!!customersError}
            >
              <MenuItem value="">
                <em>Select a customer</em>
              </MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={String(customer.id)}>
                  {customer.customerName || `${customer.first_name} ${customer.last_name}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {customersError && (
            <Typography color="error" variant="caption">
              {customersError}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6">Invoice Items</Typography>
          <Button variant="contained" color="primary" onClick={handleAddInvoiceItem}>
            Add Item
          </Button>
          {invoiceItems.map((item, index) => (
            <Grid container key={index} spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Item Type</InputLabel>
                  <Select
                    value={item.type}
                    onChange={(e) => handleInvoiceItemChange(index, 'type', e.target.value)}
                  >
                    <MenuItem value="">Select Item Type</MenuItem>
                    <MenuItem value="product">Product</MenuItem>
                    <MenuItem value="service">Service</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {item.type === 'product' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={item.productId || ''}
                      onChange={(e) => handleInvoiceItemChange(index, 'productId', e.target.value)}
                    >
                      <MenuItem value="">Select a product</MenuItem>
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {item.type === 'service' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Service</InputLabel>
                    <Select
                      value={item.serviceId || ''}
                      onChange={(e) => handleInvoiceItemChange(index, 'serviceId', e.target.value)}
                    >
                      <MenuItem value="">Select a service</MenuItem>
                      {services.map((service) => (
                        <MenuItem key={service.id} value={service.id}>
                          {service.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={6}>
                <TextField
                  label="Description"
                  value={item.description}
                  onChange={(e) => handleInvoiceItemChange(index, 'description', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Quantity"
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleInvoiceItemChange(index, 'quantity', parseFloat(e.target.value))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Unit Price"
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleInvoiceItemChange(index, 'unitPrice', parseFloat(e.target.value))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Amount"
                  value={item.amount}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
              </Grid>
            </Grid>
          ))}
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={handleOpenTemplateBuilder}>
            Open Template Builder
          </Button>
        </Grid>
      </Grid>
      {showTemplateBuilder && (
        <InvoiceTemplateBuilder
          handleClose={handleCloseTemplateBuilder}
          userData={userData}
          logo={logo}
          accentColor={accentColor}
          template={template}
          invoiceItems={invoiceItems}
          handleLogoUpload={handleLogoUpload}
          handleAccentColorChange={handleAccentColorChange}
          handleTemplateChange={handleTemplateChange}
          handleAddInvoiceItem={handleAddInvoiceItem}
          handleInvoiceItemChange={handleInvoiceItemChange}
        />
      )}
      <InvoicePreview
        logo={logo}
        accentColor={accentColor}
        template={template}
        userData={userData}
        invoiceItems={invoiceItems}
        products={products}
        services={services}
      />

      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button variant="outlined" color="inherit" sx={{ mr: 2 }} onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default InvoiceForm;
