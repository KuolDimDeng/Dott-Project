'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Box, 
  Container
} from '@mui/material';

/*
 * SimpleProductForm - Updated to use MUI's recommended approach
 * Using proper controlled TextField components
 */
export default function SimpleProductForm() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!name || !price) {
      toast.error('Name and price are required');
      return;
    }
    
    // Show success
    toast.success(`Product created: ${name}`);
    
    // Clear form
    setName('');
    setPrice('');
    setDescription('');
    setStock('');
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={2} sx={{ p: 3, mt: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Simple Product Form
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This form uses MUI TextField components with controlled inputs following MUI's best practices.
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            id="product-name"
            label="Product Name"
            variant="outlined"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          
          <TextField
            id="product-price"
            label="Price"
            variant="outlined"
            fullWidth
            margin="normal"
            type="number"
            inputProps={{ step: "0.01" }}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          
          <TextField
            id="product-description"
            label="Description"
            variant="outlined"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          
          <TextField
            id="product-stock"
            label="Stock Quantity"
            variant="outlined"
            fullWidth
            margin="normal"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isLoading}
            sx={{ mt: 2, p: 1.5 }}
          >
            {isLoading ? 'Creating...' : 'Create Product'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}