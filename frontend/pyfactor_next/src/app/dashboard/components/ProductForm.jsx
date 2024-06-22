import React, { useState } from 'react';
import { Box, Typography, TextField, FormControlLabel, Checkbox, Button } from '@mui/material';
import axiosInstance from './axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';



const ProductForm = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [sellEnabled, setSellEnabled] = useState(false);
  const [buyEnabled, setBuyEnabled] = useState(false);
  const [salesTax, setSalesTax] = useState(0);
  const [error, setError] = useState(null);
  const { addMessage } = useUserMessageContext();


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const productData = {
        name,
        description,
        price,
        sellEnabled,
        buyEnabled,
        salesTax,
      };
      logger.info('Product data:', productData);
      const response = await axiosInstance.post('http://localhost:8000/api/create-product/', productData);
      logger.info('Product created successfully', response.data);
      addMessage('info', 'Product created successfully');

      // Reset form fields or navigate to the product list page
    } catch (error) {
      logger.error('Error creating product', error);
      addMessage('error', 'Product created successfully');
      // Handle error condition
    }
  };


  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add a Product
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Name"
          variant="outlined"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Description"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          margin="normal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          label="Price"
          variant="outlined"
          fullWidth
          type="number"
          margin="normal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={sellEnabled}
              onChange={(e) => setSellEnabled(e.target.checked)}
              name="sellEnabled"
            />
          }
          label="Sell this"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={buyEnabled}
              onChange={(e) => setBuyEnabled(e.target.checked)}
              name="buyEnabled"
            />
          }
          label="Buy this"
        />
        <TextField
          label="Sales Tax (%)"
          variant="outlined"
          fullWidth
          type="number"
          margin="normal"
          value={salesTax}
          onChange={(e) => setSalesTax(e.target.value)}
        />
        <Button variant="contained" color="primary" type="submit" fullWidth>
          Add Product
        </Button>
      </form>
    </Box>
  );
};

export default ProductForm;