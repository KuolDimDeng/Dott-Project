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
import { inventoryService } from '@/services/inventoryService';
import { userService } from '@/services/userService';
import { useUser } from '@/contexts/UserContext';
import { fetchAuthSession } from 'aws-amplify/auth';
import { setTokens } from '@/utils/tenantUtils';

// This component is currently not used directly in the app
// It might be causing conflicts with ProductManagement.js
// Add a console warning to prevent accidental usage
console.warn('ProductForm.js is loaded but should not be used - use ProductManagement.js instead');

const ProductForm = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, loading: userLoading } = useUser();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRefreshed, setSessionRefreshed] = useState(false);

  // Add debug warning
  useEffect(() => {
    console.warn('WARNING: ProductForm component mounted - this component might be conflicting with ProductManagement.js');
    return () => console.warn('ProductForm component unmounted');
  }, []);

  useEffect(() => {
    // Initialize tenant context from user data
    if (user?.tenant?.id) {
      console.log(`Product form initialized with tenant from context: ${user.tenant.id}`);
    } else if (!userLoading) {
      console.warn('No tenant context available in user data');
    }
    
    // Force session refresh when component mounts
    const refreshSession = async () => {
      try {
        logger.info('Manually refreshing session on ProductForm mount');
        const sessionResult = await fetchAuthSession({ forceRefresh: true });
        
        if (sessionResult.tokens?.idToken && sessionResult.tokens?.accessToken) {
          // Store tokens in localStorage
          localStorage.setItem('tokens', JSON.stringify({
            accessToken: sessionResult.tokens.accessToken.toString(),
            idToken: sessionResult.tokens.idToken.toString()
          }));
          
          // Update tokens in tenant utils
          setTokens({
            accessToken: sessionResult.tokens.accessToken.toString(),
            idToken: sessionResult.tokens.idToken.toString()
          });
          
          logger.info('Session refreshed successfully on component mount');
          setSessionRefreshed(true);
          
          // Add a success snackbar
          setSnackbarSeverity('success');
          setSnackbarMessage('Session refreshed successfully');
          setOpenSnackbar(true);
        } else {
          logger.warn('Failed to refresh tokens on component mount');
          // Show warning to user
          setSnackbarSeverity('warning');
          setSnackbarMessage('Session refresh failed - try signing in again');
          setOpenSnackbar(true);
        }
      } catch (error) {
        logger.error('Error refreshing session on component mount:', error);
        setSnackbarSeverity('error');
        setSnackbarMessage('Session refresh error - please sign in again');
        setOpenSnackbar(true);
      }
    };
    
    refreshSession();
  }, [user, userLoading]);

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

  // Handle authentication errors
  const handleAuthError = () => {
    setSnackbarSeverity('error');
    setSnackbarMessage('Your session has expired. Please sign in again.');
    setOpenSnackbar(true);
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = '/auth/signin?error=session_expired';
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product.name) {
      setError('Product name is required');
      return;
    }

    if (isSubmitting) {
      return; // Prevent multiple submissions
    }

    setIsSubmitting(true);

    try {
      // Always refresh session before submission
      logger.info('Refreshing session before product submission');
      const sessionResult = await fetchAuthSession({ forceRefresh: true });
      
      if (!sessionResult.tokens?.idToken || !sessionResult.tokens?.accessToken) {
        logger.warn('Failed to refresh tokens before submission - missing tokens');
        setSnackbarSeverity('error');
        setSnackbarMessage('Authentication failed - please sign in again');
        setOpenSnackbar(true);
        
        setTimeout(() => {
          window.location.href = '/auth/signin?error=session_expired';
        }, 2000);
        
        setIsSubmitting(false);
        return;
      }
      
      const accessToken = sessionResult.tokens.accessToken.toString();
      const idToken = sessionResult.tokens.idToken.toString();
      
      // Store tokens in localStorage
      localStorage.setItem('tokens', JSON.stringify({
        accessToken,
        idToken
      }));
      
      // Update tokens in tenant utils
      setTokens({
        accessToken,
        idToken
      });
      
      logger.info('Session refreshed successfully before submission');
      
      // Get the tenant ID
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) {
        throw new Error('No valid tenant information available');
      }
      
      const schemaName = tenantId ? `tenant_${tenantId.replace(/-/g, '_')}` : null;
      
      logger.info('Submitting product with data:', {
        ...product,
        tenant: tenantId,
        schema: schemaName
      });
      
      // Set up headers with refreshed tokens
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': schemaName
      };
      
      // Make a direct fetch call to ensure all headers are sent correctly
      const response = await fetch('/api/inventory/products/', {
        method: 'POST',
        headers,
        body: JSON.stringify(product)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
        throw new Error(errorData.message || errorData.error || `Failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      
      logger.info('Product created successfully:', responseData);
      
      // Show success message
      setSnackbarSeverity('success');
      setSnackbarMessage('Product created successfully!');
      setOpenSnackbar(true);
      
      // Reset form
      resetForm();
      
      // Show print dialog if product has ID
      if (responseData.id) {
        setProduct(responseData);
        setOpenPrintDialog(true);
      }
    } catch (error) {
      logger.error('Error creating product', error);
      
      // Check for authentication errors
      if (error.response?.status === 401 || 
          error.message?.includes('session') || 
          error.message?.includes('Authentication required') ||
          error.response?.data?.code === 'session_expired' ||
          error.message?.includes('401')) {
        
        setSnackbarSeverity('error');
        setSnackbarMessage('Authentication failed - please sign in again');
        setOpenSnackbar(true);
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/auth/signin?error=session_expired';
        }, 2000);
      } else {
        // Generic error handling
        setSnackbarSeverity('error');
        setSnackbarMessage(`Error creating product: ${error.message}`);
        setOpenSnackbar(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  // Add diagnostics button
  const runDiagnostics = async () => {
    try {
      setSnackbarSeverity('info');
      setSnackbarMessage('Running authentication diagnostics...');
      setOpenSnackbar(true);
      
      // Get the tokens directly from localStorage to ensure they're the latest
      const tokensStr = localStorage.getItem('tokens');
      let accessToken, idToken;
      
      if (tokensStr) {
        try {
          const tokens = JSON.parse(tokensStr);
          accessToken = tokens.accessToken;
          idToken = tokens.idToken;
          logger.debug('Tokens found in localStorage:', {
            hasAccessToken: !!accessToken,
            hasIdToken: !!idToken
          });
        } catch (parseError) {
          logger.error('Error parsing tokens from localStorage:', parseError);
        }
      } else {
        logger.warn('No tokens found in localStorage');
      }
      
      // Also check regular localStorage keys as backup
      if (!accessToken) {
        accessToken = localStorage.getItem('accessToken') || 
                     localStorage.getItem('pyfactor_access_token');
      }
      
      if (!idToken) {
        idToken = localStorage.getItem('idToken') || 
                 localStorage.getItem('pyfactor_id_token');
      }
      
      // Get tenant info
      const tenantId = localStorage.getItem('tenantId');
      
      if (!tenantId) {
        setSnackbarSeverity('error');
        setSnackbarMessage('No tenant ID found in localStorage');
        setOpenSnackbar(true);
        return;
      }
      
      if (!accessToken || !idToken) {
        setSnackbarSeverity('error');
        setSnackbarMessage('No auth tokens found in localStorage');
        setOpenSnackbar(true);
        
        // Try to refresh auth session
        try {
          logger.info('Attempting to refresh missing tokens');
          const refreshResult = await fetchAuthSession({ forceRefresh: true });
          
          if (refreshResult.tokens?.accessToken && refreshResult.tokens?.idToken) {
            accessToken = refreshResult.tokens.accessToken.toString();
            idToken = refreshResult.tokens.idToken.toString();
            
            // Store in localStorage
            localStorage.setItem('tokens', JSON.stringify({
              accessToken,
              idToken
            }));
            
            logger.info('Successfully refreshed tokens');
            setSnackbarSeverity('success');
            setSnackbarMessage('Successfully refreshed authentication tokens');
            setOpenSnackbar(true);
          } else {
            logger.error('Failed to refresh tokens');
          }
        } catch (refreshError) {
          logger.error('Error refreshing tokens:', refreshError);
        }
      }
      
      // Make the diagnostic API call
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || ''}`,
        'X-Id-Token': idToken || '',
        'X-Tenant-ID': tenantId
      };
      
      logger.info('Making diagnostic API call with headers:', {
        hasAuth: !!headers.Authorization,
        hasIdToken: !!headers['X-Id-Token'],
        hasTenant: !!headers['X-Tenant-ID']
      });
      
      const response = await fetch('/api/inventory/diagnostic', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId })
      });
      
      if (!response.ok) {
        throw new Error(`Diagnostic API returned status ${response.status}`);
      }
      
      const data = await response.json();
      logger.info('Diagnostic results:', data);
      
      if (data.diagnosticInfo?.auth) {
        const authInfo = data.diagnosticInfo.auth;
        
        if (authInfo.status === 'valid') {
          setSnackbarSeverity('success');
          setSnackbarMessage(`Authentication is valid! Token expires in ${Math.floor(authInfo.timeRemaining / 60)} minutes`);
        } else {
          setSnackbarSeverity('error');
          setSnackbarMessage(`Authentication issue: ${authInfo.message}`);
          
          // Try to refresh the tokens
          try {
            logger.info('Attempting to refresh tokens after diagnostic failure');
            const sessionResult = await fetchAuthSession({ forceRefresh: true });
            
            if (sessionResult.tokens?.idToken && sessionResult.tokens?.accessToken) {
              // Store tokens in localStorage
              localStorage.setItem('tokens', JSON.stringify({
                accessToken: sessionResult.tokens.accessToken.toString(),
                idToken: sessionResult.tokens.idToken.toString()
              }));
              
              // Update tokens in tenant utils
              setTokens({
                accessToken: sessionResult.tokens.accessToken.toString(),
                idToken: sessionResult.tokens.idToken.toString()
              });
              
              logger.info('Token refresh successful');
              setSnackbarSeverity('info');
              setSnackbarMessage('Session refreshed. Try product creation again.');
              setOpenSnackbar(true);
            } else {
              logger.warn('Token refresh returned incomplete data');
              setSnackbarSeverity('warning');
              setSnackbarMessage('Unable to refresh authentication. Try signing in again.');
            }
          } catch (refreshError) {
            logger.error('Failed to refresh session:', refreshError);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to refresh session. Please sign in again.');
          }
        }
      } else {
        setSnackbarSeverity('warning');
        setSnackbarMessage('Diagnostic check returned incomplete data');
      }
    } catch (error) {
      logger.error('Error running diagnostics:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage(`Diagnostic error: ${error.message}`);
      setOpenSnackbar(true);
    }
  };

  const handlePrintBarcode = async () => {
    try {
      if (!product.id) {
        console.error('Product must be saved before printing barcode');
        return;
      }

      // Check if it's a mock product
      if (product.id.toString().startsWith('mock-')) {
        // Generate a mock barcode
        const mockBarcodeData = `Mock barcode for ${product.name}`;
        
        // Create a mock download
        const blob = new Blob([mockBarcodeData], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `mock_barcode_${product.product_code}.txt`;
        link.click();
        
        setSnackbarSeverity('success');
        setSnackbarMessage('Mock barcode generated successfully');
        setOpenSnackbar(true);
        setOpenPrintDialog(false);
        resetForm(); // Reset the form after successful barcode generation
        return;
      }

      // Using inventoryService to ensure proper tenant context and authentication
      const barcodeData = await inventoryService.printProductBarcode(product.id);
      
      const blob = new Blob([barcodeData], { type: 'image/png' });

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
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 2, borderRadius: 2 }}>
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

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" gutterBottom>
              Create New Product
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={runDiagnostics}
              sx={{ ml: 2 }}
            >
              Check Authentication
            </Button>
          </Grid>
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </Button>
              <Tooltip title="Learn more about product creation">
                <IconButton color="primary">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Box>

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
