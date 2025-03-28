'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField, 
  FormControl, 
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';

/**
 * ProductForm - A clean MUI-based form using React's controlled components
 * instead of direct DOM manipulation
 */
export default function ProductForm({ onSubmit }) {
  // Use React state for form values instead of refs
  const [formState, setFormState] = useState({
    name: '',
    price: '',
    stock_quantity: '',
    description: ''
  });
  
  // Form submission and UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    try {
      setIsSubmitting(true);
      
      // Validate form
      if (!formState.name.trim()) {
        throw new Error('Product name is required');
      }
      
      // Format data for submission
      const productData = {
        name: formState.name.trim(),
        price: parseFloat(formState.price) || 0,
        stock_quantity: parseInt(formState.stock_quantity) || 0,
        description: formState.description.trim()
      };
      
      // Call the submit handler
      await onSubmit(productData);
      
      // Show success and reset form
      setSuccessMessage('Product created successfully!');
      setFormState({
        name: '',
        price: '',
        stock_quantity: '',
        description: ''
      });
    } catch (error) {
      setError(error.message || 'An error occurred while creating the product');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Create New Product
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Product Name"
                name="name"
                value={formState.name}
                onChange={handleChange}
                placeholder="Enter product name"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Price"
                name="price"
                type="number"
                inputProps={{ step: "0.01", min: "0" }}
                value={formState.price}
                onChange={handleChange}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stock Quantity"
                name="stock_quantity"
                type="number"
                inputProps={{ step: "1", min: "0" }}
                value={formState.stock_quantity}
                onChange={handleChange}
                placeholder="0"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                multiline
                rows={4}
                value={formState.description}
                onChange={handleChange}
                placeholder="Enter product description"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting}
                fullWidth
                sx={{ mt: 2 }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                    Creating Product...
                  </>
                ) : (
                  'Create Product'
                )}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
} 