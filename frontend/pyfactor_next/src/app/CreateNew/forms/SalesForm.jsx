import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography,
  IconButton,
  Grid,
  Autocomplete,
  Paper,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const SalesForm = ({ onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sale, setSale] = useState({
    customer: '',
    date: new Date(),
    payment_method: '',
    items: [],
    total_amount: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const { addMessage } = useUserMessageContext();
  const [barcodeInput, setBarcodeInput] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axiosInstance.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      addMessage('error', 'Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      addMessage('error', 'Failed to fetch products');
    }
  };

  const handleChange = (e) => {
    setSale({ ...sale, [e.target.name]: e.target.value });
  };

  const handleCustomerChange = (event, newValue) => {
    if (typeof newValue === 'string') {
      // Create a new customer
      setSale({ ...sale, customer: newValue });
    } else if (newValue && newValue.inputValue) {
      // Create a new customer from the input value
      setSale({ ...sale, customer: newValue.inputValue });
    } else {
      // Select an existing customer
      setSale({ ...sale, customer: newValue ? newValue.id : '' });
    }
  };

  const handleDateChange = (date) => {
    setSale({ ...sale, date });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...sale.items];
    updatedItems[index][field] = value;
    
    if (field === 'product') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        updatedItems[index].unit_price = selectedProduct.price;
      }
    }

    setSale({ ...sale, items: updatedItems });
    calculateTotal(updatedItems);
  };

  const addItem = () => {
    setSale({
      ...sale,
      items: [...sale.items, { product: '', quantity: 1, unit_price: 0 }],
    });
  };

  const removeItem = (index) => {
    const updatedItems = sale.items.filter((_, i) => i !== index);
    setSale({ ...sale, items: updatedItems });
    calculateTotal(updatedItems);
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    setSale(prevSale => ({ ...prevSale, total_amount: total }));
  };

  const handleBarcodeInputChange = (e) => {
    setBarcodeInput(e.target.value);
    if (e.key === 'Enter') {
      handleBarcodeSubmit();
    }
  };

  const handleBarcodeSubmit = async () => {
    try {
      const response = await axiosInstance.get(`/api/products/barcode/${barcodeInput}/`);
      const scannedProduct = response.data;
      
      // Add the scanned product to the items list
      const newItem = {
        product: scannedProduct.id,
        quantity: 1,
        unit_price: scannedProduct.price
      };
      
      setSale(prevSale => ({
        ...prevSale,
        items: [...prevSale.items, newItem]
      }));
      
      calculateTotal([...sale.items, newItem]);
      setBarcodeInput('');
      addMessage('success', `Added ${scannedProduct.name} to the sale`);
    } catch (error) {
      console.error('Error fetching product by barcode:', error);
      addMessage('error', 'Failed to fetch product by barcode');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/sales/create/', sale);
      console.log('Sale created:', response.data);
      addMessage('success', 'Sale created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating sale:', error);
      addMessage('error', 'Failed to create sale');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
      <Box display="flex" alignItems="center" mb={2}>
        <PointOfSaleIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Create Sale
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Record a new sale transaction
          </Typography>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              freeSolo
              options={customers}
              getOptionLabel={(option) => {
                if (typeof option === 'string') {
                  return option;
                }
                return option.customerName || '';
              }}
              renderInput={(params) => <TextField {...params} label="Customer" required />}
              value={customers.find(c => c.id === sale.customer) || null}
              onChange={handleCustomerChange}
              onInputChange={(event, newInputValue) => {
                if (!customers.some(c => c.customerName === newInputValue)) {
                  setSale({ ...sale, customer: newInputValue });
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Sale Date"
                value={sale.date}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                name="payment_method"
                value={sale.payment_method}
                onChange={handleChange}
                required
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="credit_card">Credit Card</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" alignItems="center">
              <TextField
                label="Scan Barcode"
                value={barcodeInput}
                onChange={handleBarcodeInputChange}
                onKeyPress={handleBarcodeInputChange}
                fullWidth
              />
              <IconButton onClick={handleBarcodeSubmit} color="primary">
                <QrCodeScannerIcon />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">Sale Items</Typography>
            {sale.items.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FormControl sx={{ mr: 1, flexGrow: 1 }}>
                  <InputLabel>Product</InputLabel>
                  <Select
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                    required
                  >
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  type="number"
                  label="Quantity"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                  sx={{ mr: 1, width: '100px' }}
                  required
                />
                <TextField
                  type="number"
                  label="Unit Price"
                  value={item.unit_price}
                  onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                  sx={{ mr: 1, width: '120px' }}
                  required
                />
                <IconButton onClick={() => removeItem(index)} color="secondary">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={addItem}>
              Add Item
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">Total Amount: ${sale.total_amount.toFixed(2)}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Button type="submit" variant="contained" color="primary" size="large">
                Create Sale
              </Button>
              <Button onClick={onClose} variant="outlined" color="secondary">
                Cancel
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default SalesForm;