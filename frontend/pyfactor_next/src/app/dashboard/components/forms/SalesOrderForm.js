import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import Alert from '@mui/material/Alert';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const SalesOrderForm = ({ onSave, initialData }) => {
  const [salesOrder, setSalesOrder] = useState(
    initialData || {
      customerId: '',
      items: [],
      discount: 0,
      currency: 'USD',
      date: new Date(),
      totalAmount: 0,
    }
  );

  const [customers, setCustomers] = useState([]);
  const [customersError, setCustomersError] = useState(null);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [userDatabase, setUserDatabase] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const toast = useToast();

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
    console.log('SalesOrder state updated:', salesOrder);
  }, [salesOrder]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database set to:', response.data.database_name);
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
      setCustomersError(`Failed to load customers. ${error.message}`);
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
      console.error('Error fetching products:', error);
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
      console.error('Error fetching services:', error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setSalesOrder({ ...salesOrder, [name]: value });
  };

  const handleCustomerChange = (event) => {
    const selectedId = event.target.value;
    setSalesOrder((prevState) => ({
      ...prevState,
      customerId: selectedId,
    }));
  };

  const calculateTotalAmount = (items, discount) => {
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return total - discount;
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...salesOrder.items];
    updatedItems[index][field] = value;

    if (field === 'product') {
      const selectedProduct = products.find((product) => product.id === value);
      if (selectedProduct) {
        updatedItems[index].unitPrice = parseFloat(selectedProduct.price);
        updatedItems[index].description = selectedProduct.name;
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].quantity = parseFloat(updatedItems[index].quantity) || 0;
      updatedItems[index].unitPrice = parseFloat(updatedItems[index].unitPrice) || 0;
    }

    const totalAmount = calculateTotalAmount(updatedItems, salesOrder.discount);
    setSalesOrder({ ...salesOrder, items: updatedItems, totalAmount });
  };

  const handleItemAdd = () => {
    setSalesOrder({
      ...salesOrder,
      items: [...salesOrder.items, { product: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleItemRemove = (index) => {
    const updatedItems = salesOrder.items.filter((_, i) => i !== index);
    const totalAmount = calculateTotalAmount(updatedItems, salesOrder.discount);
    setSalesOrder({ ...salesOrder, items: updatedItems, totalAmount });
  };

  const handleDiscountChange = (event) => {
    const discount = parseFloat(event.target.value) || 0;
    const totalAmount = calculateTotalAmount(salesOrder.items, discount);
    setSalesOrder({ ...salesOrder, discount, totalAmount });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      if (!salesOrder.customerId || salesOrder.items.length === 0) {
        throw new Error('Please fill out all required fields and add at least one item');
      }

      const salesOrderData = {
        customer: salesOrder.customerId,
        items: salesOrder.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        discount: salesOrder.discount,
        currency: salesOrder.currency,
        date: salesOrder.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        totalAmount: salesOrder.totalAmount,
      };

      const response = await axiosInstance.post('/api/salesorders/create/', salesOrderData);

      setSuccessMessage('Sales order created successfully');
      setSalesOrder(response.data);
      if (onSave) {
        onSave(response.data);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const errorMessages = Object.entries(err.response.data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        setError(errorMessages);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, my: 2 }}>
      <Typography variant="h4" gutterBottom>
        Create New Sales Order
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="customer-select-label">Customer</InputLabel>
            <Select
              labelId="customer-select-label"
              id="customer-select"
              value={salesOrder.customerId}
              onChange={handleCustomerChange}
              label="Customer"
            >
              <MenuItem value="">
                <em>Select a customer</em>
              </MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
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
          <Typography variant="h6" gutterBottom>
            Items
          </Typography>
          {salesOrder.items.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', mb: 2 }}>
              <FormControl sx={{ mr: 2, flexGrow: 1 }}>
                <InputLabel>Product</InputLabel>
                <Select
                  value={item.product}
                  onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                  label="Product"
                >
                  <MenuItem value="">Select a product</MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                sx={{ mr: 2, width: '100px' }}
                type="number"
                label="Quantity"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
              />
              <TextField
                sx={{ mr: 2, width: '150px' }}
                type="number"
                label="Unit Price"
                value={item.unitPrice}
                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
              />
              <TextField
                sx={{ flexGrow: 1 }}
                label="Description"
                value={item.description || ''}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              />
              <Button variant="contained" color="secondary" onClick={() => handleItemRemove(index)}>
                Remove
              </Button>
            </Box>
          ))}
          <Button variant="outlined" onClick={handleItemAdd}>
            Add Item
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Discount"
            name="discount"
            value={salesOrder.discount}
            onChange={handleDiscountChange}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Total Amount"
            value={salesOrder.totalAmount.toFixed(2)}
            InputProps={{
              readOnly: true,
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select
              name="currency"
              value={salesOrder.currency}
              onChange={handleInputChange}
              label="Currency"
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Create Sales Order'}
          </Button>
        </Grid>
      </Grid>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default SalesOrderForm;
