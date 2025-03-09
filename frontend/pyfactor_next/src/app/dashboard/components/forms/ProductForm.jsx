import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormLabel,
  Grid,
  Paper,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery,
  Link,
  Snackbar,
  Alert,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
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
    saleType: 'sale',
    salesTax: 0,
    stock_quantity: 0,
    reorder_level: 0,
    height: '',
    width: '',
    height_unit: 'cm',
    width_unit: 'cm',
    weight: '',
    weight_unit: 'kg',
  });
  const [error, setError] = useState('');
  const [openPrintDialog, setOpenPrintDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProduct((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setProduct({
      name: '',
      description: '',
      price: 0,
      saleType: 'sale',
      salesTax: 0,
      stock_quantity: 0,
      reorder_level: 0,
      height: '',
      width: '',
      height_unit: 'cm',
      width_unit: 'cm',
      weight: '',
      weight_unit: 'kg',
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product.name) {
      setError('Product name is required');
      return;
    }

    try {
    logger.info('Product data:', product);
    // Using the new API endpoint from the inventory module
    const response = await axiosInstance.post('/api/inventory/products/create/', product);
    logger.info('Product created successfully', response.data);

      // Set the success message
      setSnackbarMessage(`Product "${response.data.name}" created successfully`);
      setOpenSnackbar(true);

      setProduct(response.data);
      setOpenPrintDialog(true);
    } catch (error) {
      logger.error('Error creating product', error);
      if (error.response) {
        logger.error('Error response data:', error.response.data);
      }
      setSnackbarMessage('Error creating product');
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  const handlePrintBarcode = async () => {
    try {
      if (!product.id) {
        console.error('Product must be saved before printing barcode');
        return;
      }

      // Using the new API endpoint from the inventory module
      const response = await axiosInstance.get(`/api/inventory/products/${product.id}/print-barcode/`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'image/png' });

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `barcode_${product.product_code}.png`;
      link.click();

      setSnackbarSeverity('success');
      setSnackbarMessage('Barcode generated successfully');
      setOpenSnackbar(true);
      setOpenPrintDialog(false);
      resetForm(); // Reset the form after successful barcode generation
    } catch (error) {
      console.error('Error printing barcode:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Error generating barcode');
      setOpenSnackbar(true);
    }
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <InventoryIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" gutterBottom>
            Add a Product
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Create and manage your product inventory
          </Typography>
        </Box>
      </Box>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Name"
              name="name"
              value={product.name}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">Product Type</FormLabel>
              <RadioGroup
                row
                aria-label="saleType"
                name="saleType"
                value={product.saleType}
                onChange={handleChange}
              >
                <FormControlLabel value="sale" control={<Radio />} label="For Sale" />
                <FormControlLabel value="rent" control={<Radio />} label="For Rent" />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              name="description"
              value={product.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
          {product.saleType === 'sale' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price"
                  name="price"
                  type="number"
                  value={product.price}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sales Tax (%)"
                  name="salesTax"
                  type="number"
                  value={product.salesTax}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
            </>
          )}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Stock Quantity"
              name="stock_quantity"
              type="number"
              value={product.stock_quantity}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          {product.saleType === 'sale' && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Reorder Level"
                name="reorder_level"
                type="number"
                value={product.reorder_level}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="additional-info-content"
                id="additional-info-header"
              >
                <Typography>Additional Information (Height, Width, Weight)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Height"
                      name="height"
                      type="number"
                      value={product.height}
                      onChange={handleChange}
                      fullWidth
                    />
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
                    <TextField
                      label="Width"
                      name="width"
                      type="number"
                      value={product.width}
                      onChange={handleChange}
                      fullWidth
                    />
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
                    <TextField
                      label="Weight"
                      name="weight"
                      type="number"
                      value={product.weight}
                      onChange={handleChange}
                      fullWidth
                    />
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
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
          <Grid item xs={12}>
            <Box
              display="flex"
              flexDirection={isMobile ? 'column' : 'row'}
              justifyContent="space-between"
              alignItems={isMobile ? 'stretch' : 'center'}
            >
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth={isMobile}
                sx={{ mb: isMobile ? 2 : 0 }}
              >
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

      {product.saleType === 'rent' && (
        <Typography variant="body2" color="text.secondary" mt={2}>
          Create a custom rental plan{' '}
          <Link href="/settings/business-settings/custom-charge-settings">here</Link> and use when
          making a sales transaction.
        </Typography>
      )}

      <Dialog open={openPrintDialog} onClose={() => setOpenPrintDialog(false)}>
        <DialogTitle>Print Barcode</DialogTitle>
        <DialogContent>
          <Typography>Do you want to generate a barcode for this product?</Typography>
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

      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductForm;
