'use client';


import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField, 
  FormControl, 
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert
} from '@/components/ui/TailwindComponents';

/**
 * ProductForm - A clean form using React's controlled components
 * instead of direct DOM manipulation
 * @param {function} onSubmit - Function to handle form submission
 * @param {string} mode - 'create' or 'edit' mode
 */
export default function ProductForm({ onSubmit, mode = 'create' }) {
  // Use React state for form values instead of refs
  const [formState, setFormState] = useState({
    name: '',
    price: '',
    stock_quantity: '',
    description: '',
    sku: ''
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
        description: formState.description.trim(),
        sku: formState.sku?.trim() || `SKU-${Date.now().toString().substring(9)}`,
      };
      
      // Check if onSubmit is provided
      if (typeof onSubmit !== 'function') {
        throw new Error('Form submission handler not provided');
      }
      
      // Call the submit handler
      await onSubmit(productData);
      
      // Show success and reset form
      setSuccessMessage(`Product ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      
      if (mode === 'create') {
        setFormState({
          name: '',
          price: '',
          stock_quantity: '',
          description: '',
          sku: ''
        });
      }
    } catch (error) {
      setError(error.message || `An error occurred while ${mode === 'create' ? 'creating' : 'updating'} the product`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Focus the name field when component mounts for better UX
    const timer = setTimeout(() => {
      const inputElement = document.querySelector('input[name="name"]');
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Box className="p-3">
      <Typography variant="h5" component="h1" className="mb-4">
        Create New Product
      </Typography>
      
      <Paper className="p-3 mt-2 relative z-1">
        {error && (
          <Alert severity="error" className="mb-3">
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" className="mb-3">
            {successMessage}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3">
            <div className="col-span-1">
              <TextField
                fullWidth
                required
                label="Product Name"
                name="name"
                value={formState.name}
                onChange={handleChange}
                placeholder="Enter product name"
                disabled={isSubmitting}
                className="relative z-2"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="col-span-1">
                <TextField
                  fullWidth
                  required
                  label="Price"
                  name="price"
                  type="number"
                  value={formState.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={isSubmitting}
                  inputProps={{ step: "0.01", min: "0" }}
                  className="relative z-2"
                />
              </div>
              
              <div className="col-span-1">
                <TextField
                  fullWidth
                  label="Stock Quantity"
                  name="stock_quantity"
                  type="number"
                  value={formState.stock_quantity}
                  onChange={handleChange}
                  placeholder="0"
                  disabled={isSubmitting}
                  inputProps={{ step: "1", min: "0" }}
                  className="relative z-2"
                />
              </div>
            </div>
            
            <div className="col-span-1">
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
                className="relative z-2"
              />
            </div>
            
            <div className="col-span-1">
              <TextField
                fullWidth
                label="SKU"
                name="sku"
                value={formState.sku}
                onChange={handleChange}
                placeholder="Enter product SKU"
                disabled={isSubmitting}
                className="relative z-2"
              />
            </div>
            
            <div className="col-span-1">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                fullWidth
                className="mt-2"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <CircularProgress size="small" className="mr-2" />
                    <span>Creating Product...</span>
                  </div>
                ) : (
                  'Create Product'
                )}
              </Button>
            </div>
          </div>
        </form>
      </Paper>
    </Box>
  );
} 