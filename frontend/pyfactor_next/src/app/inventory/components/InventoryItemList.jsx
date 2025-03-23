import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  useTheme,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { inventoryService } from '@/services/inventoryService';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

// Component for displaying and managing inventory items

const InventoryItemList = () => {
  const [state, setState] = useState({
    items: [],
    isLoading: true,
    error: null,
    snackbar: {
      open: false,
      message: '',
      severity: 'info',
    },
    dialogOpen: false,
    currentItem: {
      name: '',
      sku: '',
      description: '',
      quantity: 0,
      reorder_level: 0,
      unit_price: 0,
    },
    isMockData: false,
  });
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [skipInitialApiCall, setSkipInitialApiCall] = useState(false);
  const theme = useTheme();

  const showSnackbar = (message, severity = 'info') => {
    setState(prev => ({
      ...prev,
      snackbar: {
        open: true,
        message,
        severity
      }
    }));
  };

  const handleSnackbarClose = () => {
    setState(prev => ({
      ...prev,
      snackbar: {
        ...prev.snackbar,
        open: false
      }
    }));
  };

  const fetchItems = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const products = await inventoryService.getProducts({}, {
        timeout: 15000,
        notify: true,
        customMessage: 'Unable to load inventory products. Using offline data.'
      });
      
      // Check if we got an array of products directly or if it's in a results object
      const items = Array.isArray(products) ? products : (products.results || []);
      
      // Determine if we're using mock data
      const isMockData = items.length > 0 && items[0].id && items[0].id.startsWith('mock-');
      
      if (items.length === 0) {
        logger.warn('No inventory items found');
      }
      
      setState(prev => ({
        ...prev,
        items,
        isLoading: false,
        isMockData,
        error: null
      }));
    } catch (error) {
      logger.error('Error fetching inventory items:', error);
      
      let errorMessage = 'Failed to load inventory items';
      let severity = 'error';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Using demo data instead.';
        severity = 'warning';
      } else if (error.message?.includes('tenant schema')) {
        errorMessage = 'Products list is unavailable for your account. Using demo data instead.';
        severity = 'warning';
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isMockData: true,
        snackbar: {
          open: true,
          message: errorMessage,
          severity
        }
      }));
    }
  };

  // Effect to fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenDialog = (item = null) => {
    if (item) {
      setState(prev => ({ 
        ...prev, 
        currentItem: { ...item },
        dialogOpen: true 
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        currentItem: {
          name: '',
          sku: '',
          description: '',
          quantity: 0,
          reorder_level: 0,
          unit_price: 0,
        },
        dialogOpen: true 
      }));
    }
  };

  const handleCloseDialog = () => {
    setState(prev => ({ 
      ...prev, 
      dialogOpen: false, 
      currentItem: {
        name: '',
        sku: '',
        description: '',
        quantity: 0,
        reorder_level: 0,
        unit_price: 0,
      }
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setState(prev => ({ 
      ...prev, 
      currentItem: { ...prev.currentItem, [name]: value } 
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!state.currentItem) {
        showSnackbar('No item data available', 'error');
        return;
      }
      
      // Validate required fields
      if (!state.currentItem.name) {
        showSnackbar('Name is required', 'error');
        return;
      }

      // Convert the item to a product format
      const productData = {
        name: state.currentItem.name || '',
        description: state.currentItem.description || '',
        price: parseFloat(state.currentItem.unit_price || state.currentItem.price || 0),
        product_code: state.currentItem.sku || state.currentItem.product_code || '',
        stock_quantity: parseInt(state.currentItem.quantity || state.currentItem.stock_quantity || 0, 10),
        reorder_level: parseInt(state.currentItem.reorder_level || 0, 10),
        is_for_sale: true
      };
      
      logger.info('Submitting product data:', productData);
      setState(prev => ({ ...prev, isLoading: true }));
      
      if (state.currentItem.id) {
        try {
          await inventoryService.updateProduct(state.currentItem.id, productData);
          logger.info('Product updated successfully');
          showSnackbar('Product updated successfully', 'success');
        } catch (error) {
          logger.error('Product update failed:', error);
          showSnackbar('Failed to update product. Please try again.', 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      } else {
        try {
          await inventoryService.createProduct(productData);
          logger.info('Product created successfully');
          showSnackbar('Product created successfully', 'success');
        } catch (error) {
          logger.error('Product creation failed:', error);
          showSnackbar('Failed to create product. Please try again.', 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }
      
      // Refresh the list and close the dialog
      await fetchItems();
      handleCloseDialog();
    } catch (error) {
      logger.error('Error saving item:', error);
      showSnackbar('Failed to save item. Please try again later.', 'error');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        try {
          await inventoryService.deleteProduct(id);
          logger.info('Product deleted successfully');
          showSnackbar('Product deleted successfully', 'success');
        } catch (error) {
          logger.error('Product deletion failed:', error);
          showSnackbar('Failed to delete product. Please try again.', 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Refresh the list after deletion
        await fetchItems();
      } catch (error) {
        logger.error('Error deleting product:', error);
        showSnackbar('Failed to delete product. Please try again later.', 'error');
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Inventory Items</Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setApiUnavailable(false); // Reset API unavailable state
              fetchItems();
            }}
            sx={{ mr: 1 }}
            disabled={state.isLoading}
          >
            Refresh
          </Button>
          <Button
            variant={state.isMockData ? "contained" : "outlined"}
            color={state.isMockData ? "secondary" : "primary"}
            onClick={() => {
              setUseMockData(!state.isMockData);
              fetchItems();
            }}
            sx={{ mr: 1 }}
            disabled={state.isLoading}
          >
            {state.isMockData ? "Using Demo Data" : "Use Demo Data"}
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={async () => {
              try {
                setState(prev => ({ ...prev, isLoading: true }));
                showSnackbar('Refreshing session...', 'info');
                
                // Import the session refresh utility
                const { refreshUserSession } = await import('@/utils/refreshUserSession');
                await refreshUserSession();
                
                showSnackbar('Session refreshed successfully', 'success');
                // Fetch items after session refresh
                await fetchItems();
              } catch (error) {
                logger.error('Error refreshing session:', error);
                showSnackbar('Failed to refresh session', 'error');
              } finally {
                setState(prev => ({ ...prev, isLoading: false }));
              }
            }}
            sx={{ mr: 1 }}
            disabled={state.isLoading}
          >
            Refresh Session
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={state.isLoading}
          >
            Add New Item
          </Button>
        </Box>
      </Box>
      
      {state.isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {state.isMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing demo data. Live inventory data is not available.
        </Alert>
      )}
      
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}
      
      {state.items.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, backgroundColor: 'white', borderRadius: 1 }}>
          <Typography variant="h6" color="text.secondary">
            No inventory items found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Add New Item" to create your first inventory item
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Reorder Level</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.product_code || 'N/A'}</TableCell>
                  <TableCell>{item.description || 'No description'}</TableCell>
                  <TableCell>{item.stock_quantity || 0}</TableCell>
                  <TableCell>{item.reorder_level || 0}</TableCell>
                  <TableCell>
                    ${typeof item.price === 'number' 
                      ? item.price.toFixed(2) 
                      : parseFloat(item.price || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={state.snackbar.severity} sx={{ width: '100%' }}>
          {state.snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={state.dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{state.currentItem && state.currentItem.id ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            value={state.currentItem ? state.currentItem.name || '' : ''}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="sku"
            label="SKU"
            type="text"
            fullWidth
            value={state.currentItem ? state.currentItem.sku || '' : ''}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            multiline
            rows={3}
            fullWidth
            value={state.currentItem ? state.currentItem.description || '' : ''}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="quantity"
            label="Quantity"
            type="number"
            fullWidth
            value={state.currentItem ? state.currentItem.quantity || 0 : 0}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="reorder_level"
            label="Reorder Level"
            type="number"
            fullWidth
            value={state.currentItem ? state.currentItem.reorder_level || 0 : 0}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="unit_price"
            label="Unit Price"
            type="number"
            fullWidth
            value={state.currentItem ? state.currentItem.unit_price || 0 : 0}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit}>{state.currentItem && state.currentItem.id ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryItemList;
