import React, { useState } from 'react';
import { Box, Typography, TextField, FormControlLabel, Button, Switch } from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const ProductForm = () => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    sellEnabled: false,
    buyEnabled: false,
    salesTax: 0,
    stock_quantity: 0,
    reorder_level: 0,
  });
  const { addMessage } = useUserMessageContext();
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setProduct(prevState => ({
      ...prevState,
      [name]: name === 'sellEnabled' || name === 'buyEnabled' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product.name) {
      setError('Product name is required');
      return;
    }

    try {
      logger.info('Product data:', product);
      const response = await axiosInstance.post('http://localhost:8000/api/products/create/', product);
      logger.info('Product created successfully', response.data);
      addMessage('info', 'Product created successfully');

      // Reset form fields or navigate to the product list page
    } catch (error) {
      logger.error('Error creating product', error);
      if (error.response) {
        logger.error('Error response data:', error.response.data);
      }
      addMessage('error', 'Error creating product');
      // Handle error condition
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add a Product
      </Typography>
      <form onSubmit={handleSubmit}>
        {error && <Typography color="error">{error}</Typography>}
        <TextField label="Name" name="name" value={product.name} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Description" name="description" value={product.description} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Price" name="price" type="number" value={product.price} onChange={handleChange} fullWidth margin="normal" />
        <FormControlLabel
          control={<Switch checked={product.sellEnabled} onChange={handleChange} name="sellEnabled" />}
          label="Sell Enabled"
        />
        <FormControlLabel
          control={<Switch checked={product.buyEnabled} onChange={handleChange} name="buyEnabled" />}
          label="Buy Enabled"
        />
        <TextField label="Sales Tax" name="salesTax" type="number" value={product.salesTax} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Stock Quantity" name="stock_quantity" type="number" value={product.stock_quantity} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Reorder Level" name="reorder_level" type="number" value={product.reorder_level} onChange={handleChange} fullWidth margin="normal" />
        <Button type="submit" variant="contained" color="primary">Create Product</Button>
      </form>
    </Box>
  );
};

export default ProductForm;
