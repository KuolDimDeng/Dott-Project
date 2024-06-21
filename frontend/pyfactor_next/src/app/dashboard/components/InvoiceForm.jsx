import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, TextField, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import InvoicePreview from './InvoicePreview';
import InvoiceTemplateBuilder from './InvoiceTemplateBuilder';
import axiosInstance from './axiosConfig';

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
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [userDatabase, setUserDatabase] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);

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

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('http://localhost:8000/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchCustomers = async (database_name) => {
    try {
      console.log('Fetching customers from database:', database_name);
      const response = await axiosInstance.get('http://localhost:8000/api/customers/', {
        params: { database: database_name },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      console.log('Fetched customers:', response.data);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async (database_name) => {
    try {
      console.log('Fetching products from database:', database_name);
      const response = await axiosInstance.get('http://localhost:8000/api/products/', {
        params: { database: database_name },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      console.log('Fetched products:', response.data);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchServices = async (database_name) => {
    try {
      console.log('Fetching services from database:', database_name);
      const response = await axiosInstance.get('http://localhost:8000/api/services/', {
        params: { database: database_name },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      console.log('Fetched services:', response.data);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleCustomerChange = (event) => {
    setSelectedCustomer(event.target.value || '');
    const selectedCustomerData = customers.find((customer) => customer.id === event.target.value);
    if (selectedCustomerData) {
      setUserData({
        first_name: selectedCustomerData.first_name,
        last_name: selectedCustomerData.last_name,
        business_name: selectedCustomerData.customerName,
        address: selectedCustomerData.street,
        city: selectedCustomerData.city || '',
        state: selectedCustomerData.billingState || '',
        zip_code: selectedCustomerData.postcode,
        phone: selectedCustomerData.phone,
        email: selectedCustomerData.email,
      });
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
    setInvoiceItems([...invoiceItems, { type: '', description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index][field] = value;
  
    if (field === 'productId' || field === 'serviceId') {
      const selectedItem = field === 'productId'
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
    try {
        const subtotal = invoiceItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const tax = subtotal * 0.1;
        const total = subtotal + tax;
  
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
  
        // Correct transaction data format
        const transactionData = {
            description: "Transaction Description", // Provide a suitable description
            account: 1, // Provide a valid account ID
            type: "credit", // Specify the transaction type
            amount: total, // Provide the total amount
            notes: "Transaction Notes", // Any additional notes
            receipt: null // Receipt file if any
        };

        const invoiceData = {
            invoice_num: newInvoiceNumber,
            customer: selectedCustomer,
            amount: total,
            due_date: currentDate.toISOString().split('T')[0], // Correct date format
            status: 'draft',
            transaction: transactionData,
        };
  
        // Save the new invoice number to the server or local storage
        await saveInvoiceNumber(newInvoiceNumber);
        console.log("Invoice data being sent to server:", invoiceData);
        const response = await axiosInstance.post('http://localhost:8000/api/invoices/', invoiceData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        console.log('Invoice created successfully', response.data);
    } catch (error) {
        console.error('Error creating invoice', error);
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
          <TextField
            select
            label="Existing Customer"
            value={selectedCustomer}
            onChange={handleCustomerChange}
            fullWidth
          >
            <MenuItem value="">Select a customer</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>
                {customer.display_name}
              </MenuItem>
            ))}
          </TextField>
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
                  onChange={(e) => handleInvoiceItemChange(index, 'quantity', parseFloat(e.target.value))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Unit Price"
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => handleInvoiceItemChange(index, 'unitPrice', parseFloat(e.target.value))}
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
