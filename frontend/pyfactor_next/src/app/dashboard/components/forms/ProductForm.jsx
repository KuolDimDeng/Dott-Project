import React, { useState, useEffect } from 'react';
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
  FormControl,
  Grid,
  Paper,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import PrintIcon from '@mui/icons-material/Print';
import InventoryIcon from '@mui/icons-material/Inventory';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const ProductForm = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
    custom_charge_plans: []
  });
  const { addMessage } = useUserMessageContext();
  const [error, setError] = useState('');
  const [openPrintDialog, setOpenPrintDialog] = useState(false);
  const [customChargePlans, setCustomChargePlans] = useState([]);
  const [openCustomPlanDialog, setOpenCustomPlanDialog] = useState(false);
  const [newCustomPlan, setNewCustomPlan] = useState({
    name: '',
    quantity: 0,
    unit: 'unit',
    custom_unit: '',
    period: 'day',
    custom_period: '',
    price: 0,
  });

  useEffect(() => {
    fetchCustomChargePlans();
  }, []);

  const fetchCustomChargePlans = async () => {
    try {
      const response = await axiosInstance.get('/api/custom-charge-plans/');
      setCustomChargePlans(response.data);
    } catch (error) {
      logger.error('Error fetching custom charge plans:', error);
      addMessage('error', 'Error fetching custom charge plans');
    }
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setProduct(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCustomPlanChange = (event) => {
    const { name, value } = event.target;
    setNewCustomPlan(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateCustomPlan = async () => {
    try {
      const response = await axiosInstance.post('/api/custom-charge-plans/create/', newCustomPlan);
      setCustomChargePlans(prev => [...prev, response.data]);
      setOpenCustomPlanDialog(false);
      setNewCustomPlan({
        name: '',
        quantity: 0,
        unit: 'unit',
        custom_unit: '',
        period: 'day',
        custom_period: '',
        price: 0,
      });
      addMessage('success', 'Custom charge plan created successfully');
    } catch (error) {
      logger.error('Error creating custom charge plan:', error);
      addMessage('error', 'Error creating custom charge plan');
    }
  };

  const handleAddCustomPlan = (plan) => {
    setProduct(prev => ({
      ...prev,
      custom_charge_plans: [...prev.custom_charge_plans, plan.id]
    }));
  };

  const handleRemoveCustomPlan = (planId) => {
    setProduct(prev => ({
      ...prev,
      custom_charge_plans: prev.custom_charge_plans.filter(id => id !== planId)
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
      const response = await axiosInstance.post('/api/products/create/', product);
      logger.info('Product created successfully', response.data);
      addMessage('success', 'Product created successfully');
      
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
      
      addMessage('success', 'Barcode generated successfully');
    } catch (error) {
      console.error('Error printing barcode:', error);
      addMessage('error', 'Error generating barcode');
    }
  };


 return (
    <Paper elevation={3} sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
      <Box display="flex" alignItems="center" mb={2}>
        <InventoryIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Add a Product
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Create and manage your product inventory
          </Typography>
        </Box>
      </Box>


      {error && <Typography color="error" mb={2}>{error}</Typography>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Name" name="name" value={product.name} onChange={handleChange} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Price" name="price" type="number" value={product.price} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description" name="description" value={product.description} onChange={handleChange} fullWidth multiline rows={3} />
          </Grid>
          <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={<Switch checked={product.is_for_sale} onChange={handleChange} name="is_for_sale" />}
            label="For Sale"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={<Switch checked={product.is_for_rent} onChange={handleChange} name="is_for_rent" />}
            label="For Rent"
          />
        </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Sales Tax (%)" name="salesTax" type="number" value={product.salesTax} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Stock Quantity" name="stock_quantity" type="number" value={product.stock_quantity} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Reorder Level" name="reorder_level" type="number" value={product.reorder_level} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Height" name="height" type="number" value={product.height} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Height Unit</InputLabel>
              <Select name="height_unit" value={product.height_unit} onChange={handleChange}>
                <MenuItem value="cm">Centimeter</MenuItem>
                <MenuItem value="m">Meter</MenuItem>
                <MenuItem value="in">Inch</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Width" name="width" type="number" value={product.width} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Width Unit</InputLabel>
              <Select name="width_unit" value={product.width_unit} onChange={handleChange}>
                <MenuItem value="cm">Centimeter</MenuItem>
                <MenuItem value="m">Meter</MenuItem>
                <MenuItem value="in">Inch</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Weight" name="weight" type="number" value={product.weight} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Weight Unit</InputLabel>
              <Select name="weight_unit" value={product.weight_unit} onChange={handleChange}>
                <MenuItem value="kg">Kilogram</MenuItem>
                <MenuItem value="lb">Pound</MenuItem>
                <MenuItem value="g">Gram</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {product.is_for_rent && (
          <>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Charge Period</InputLabel>
                <Select name="charge_period" value={product.charge_period} onChange={handleChange}>
                  <MenuItem value="hour">Hour</MenuItem>
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                  <MenuItem value="year">Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Charge Amount" name="charge_amount" type="number" value={product.charge_amount} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6">Custom Charge Plans</Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {customChargePlans.map(plan => (
                  <Chip
                    key={plan.id}
                    label={plan.name}
                    onClick={() => handleAddCustomPlan(plan)}
                    onDelete={() => handleRemoveCustomPlan(plan.id)}
                    color={product.custom_charge_plans.includes(plan.id) ? "primary" : "default"}
                  />
                ))}
              </Box>
              <Button onClick={() => setOpenCustomPlanDialog(true)}>Create New Custom Plan</Button>
            </Grid>
          </>
        )}
          
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Button type="submit" variant="contained" color="primary" size="large">
                Create Product
              </Button>
              <Tooltip title="Learn more about product creation">
                <IconButton color="primary">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </form>

      <Dialog open={openPrintDialog} onClose={() => setOpenPrintDialog(false)}>
        <DialogTitle>Print Barcode</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to generate a barcode for this product?
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
            Generate Barcode
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCustomPlanDialog} onClose={() => setOpenCustomPlanDialog(false)}>
        <DialogTitle>Create Custom Charge Plan</DialogTitle>
        <DialogContent>
          <TextField label="Name" name="name" value={newCustomPlan.name} onChange={handleCustomPlanChange} fullWidth />
          <TextField label="Quantity" name="quantity" type="number" value={newCustomPlan.quantity} onChange={handleCustomPlanChange} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Unit</InputLabel>
            <Select name="unit" value={newCustomPlan.unit} onChange={handleCustomPlanChange}>
              <MenuItem value="kg">Kilogram</MenuItem>
              <MenuItem value="unit">Per Unit</MenuItem>
              <MenuItem value="hour">Per Hour</MenuItem>
              <MenuItem value="day">Per Day</MenuItem>
              <MenuItem value="week">Per Week</MenuItem>
              <MenuItem value="month">Per Month</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          {newCustomPlan.unit === 'custom' && (
            <TextField label="Custom Unit" name="custom_unit" value={newCustomPlan.custom_unit} onChange={handleCustomPlanChange} fullWidth />
          )}
          <FormControl fullWidth>
            <InputLabel>Period</InputLabel>
            <Select name="period" value={newCustomPlan.period} onChange={handleCustomPlanChange}>
              <MenuItem value="hour">Hour</MenuItem>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          {newCustomPlan.period === 'custom' && (
            <TextField label="Custom Period" name="custom_period" value={newCustomPlan.custom_period} onChange={handleCustomPlanChange} fullWidth />
          )}
          <TextField label="Price" name="price" type="number" value={newCustomPlan.price} onChange={handleCustomPlanChange} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCustomPlanDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateCustomPlan} variant="contained" color="primary">Create</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ProductForm;