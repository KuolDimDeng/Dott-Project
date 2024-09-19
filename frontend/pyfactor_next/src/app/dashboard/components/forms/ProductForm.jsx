import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  FormControlLabel, 
  Switch, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import PrintIcon from '@mui/icons-material/Print';

const ProductForm = () => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    is_for_sale: true,
    is_for_rent: false,
    salesTax: 0,
    stock_quantity: 0,
    reorder_level: 0,
    height: '',
    width: '',
    height_unit: 'cm',
    width_unit: 'cm',
    weight: '',
    weight_unit: 'kg',
    charge_period: 'day',
    charge_amount: 0,
  });
  const { addMessage } = useUserMessageContext();
  const [error, setError] = useState('');
  const [openPrintDialog, setOpenPrintDialog] = useState(false);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setProduct(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
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
      
      // Update the product state with the response data, including the new ID
      setProduct(response.data);
      
      setOpenPrintDialog(true);
    } catch (error) {
      logger.error('Error creating product', error);
      if (error.response) {
        logger.error('Error response data:', error.response.data);
      }
      addMessage('error', 'Error creating product');
    }
  };

  const handlePrintBarcode = async () => {
    try {
      if (!product.id) {
        console.error('Product must be saved before printing barcode');
        return;
      }
      
      const response = await axiosInstance.get(`/api/products/${product.id}/print-barcode/`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'image/png' });
      
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `barcode_${product.product_code}.png`;
      link.click();
      
      console.log('Barcode sent to printer');
    } catch (error) {
      console.error('Error printing barcode:', error);
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
          control={<Switch checked={product.is_for_sale} onChange={handleChange} name="is_for_sale" />}
          label="For Sale"
        />
        <FormControlLabel
          control={<Switch checked={product.is_for_rent} onChange={handleChange} name="is_for_rent" />}
          label="For Rent"
        />
        <TextField label="Sales Tax" name="salesTax" type="number" value={product.salesTax} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Stock Quantity" name="stock_quantity" type="number" value={product.stock_quantity} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Reorder Level" name="reorder_level" type="number" value={product.reorder_level} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Height" name="height" type="number" value={product.height} onChange={handleChange} fullWidth margin="normal" />
        <FormControl fullWidth margin="normal">
          <InputLabel>Height Unit</InputLabel>
          <Select name="height_unit" value={product.height_unit} onChange={handleChange}>
            <MenuItem value="cm">Centimeter</MenuItem>
            <MenuItem value="m">Meter</MenuItem>
            <MenuItem value="in">Inch</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Width" name="width" type="number" value={product.width} onChange={handleChange} fullWidth margin="normal" />
        <FormControl fullWidth margin="normal">
          <InputLabel>Width Unit</InputLabel>
          <Select name="width_unit" value={product.width_unit} onChange={handleChange}>
            <MenuItem value="cm">Centimeter</MenuItem>
            <MenuItem value="m">Meter</MenuItem>
            <MenuItem value="in">Inch</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Weight" name="weight" type="number" value={product.weight} onChange={handleChange} fullWidth margin="normal" />
        <FormControl fullWidth margin="normal">
          <InputLabel>Weight Unit</InputLabel>
          <Select name="weight_unit" value={product.weight_unit} onChange={handleChange}>
            <MenuItem value="kg">Kilogram</MenuItem>
            <MenuItem value="lb">Pound</MenuItem>
            <MenuItem value="g">Gram</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Charge Period</InputLabel>
          <Select name="charge_period" value={product.charge_period} onChange={handleChange}>
            <MenuItem value="hour">Hour</MenuItem>
            <MenuItem value="day">Day</MenuItem>
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="year">Year</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Charge Amount" name="charge_amount" type="number" value={product.charge_amount} onChange={handleChange} fullWidth margin="normal" />
        <Button type="submit" variant="contained" color="primary">Create Product</Button>
      </form>
      <Dialog open={openPrintDialog} onClose={() => setOpenPrintDialog(false)}>
        <DialogTitle>Print Barcode</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to print a barcode for this product?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPrintDialog(false)}>Cancel</Button>
          <Button 
            onClick={handlePrintBarcode} 
            startIcon={<PrintIcon />} 
            variant="contained" 
            color="secondary"
            disabled={!product.id}
          >
            Print Barcode
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductForm;