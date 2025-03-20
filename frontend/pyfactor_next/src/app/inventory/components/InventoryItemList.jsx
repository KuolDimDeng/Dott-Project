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
  const [items, setItems] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    name: '',
    sku: '',
    description: '',
    quantity: 0,
    reorder_level: 0,
    unit_price: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [skipInitialApiCall, setSkipInitialApiCall] = useState(false);
  const theme = useTheme();

  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // No longer need fetchWithRetry as we're using the service layer

  const fetchItems = useCallback(async (forceMock = false) => {
    // Temporarily disable loading spinner
    // setLoading(true);
    setError(null);
    
    // Immediately use mock data for now due to network issues
    logger.info('Using mock inventory data due to network issues');
    const mockProducts = inventoryService.getMockProducts();
    const mappedMockData = mockProducts.map(product => ({
      ...product,
      sku: product.product_code || '',
      unit_price: product.price || 0,
      quantity: product.stock_quantity || 0,
      reorder_level: product.reorder_level || 0
    }));
    setItems(mappedMockData);
    setApiUnavailable(true);
    showSnackbar('Using demo data (API unavailable)', 'info');
    setLoading(false);
    return;
  }, [showSnackbar]);

  // Effect to fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenDialog = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setIsEditing(true);
    } else {
      setCurrentItem({
        name: '',
        sku: '',
        description: '',
        quantity: 0,
        reorder_level: 0,
        unit_price: 0,
      });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentItem({
      name: '',
      sku: '',
      description: '',
      quantity: 0,
      reorder_level: 0,
      unit_price: 0,
    });
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!currentItem.name) {
        showSnackbar('Name is required', 'error');
        return;
      }
      
      // Convert the item to a product format
      const productData = {
        name: currentItem.name,
        description: currentItem.description || '',
        price: parseFloat(currentItem.unit_price) || 0,
        product_code: currentItem.sku || undefined, // Only include if not empty
        stock_quantity: parseInt(currentItem.quantity, 10) || 0,
        reorder_level: parseInt(currentItem.reorder_level, 10) || 0,
        is_for_sale: true
      };
      
      logger.info('Submitting product data:', productData);
      setLoading(true);
      
      if (isEditing) {
        try {
          // Try to update as a product first
          await inventoryService.updateProduct(currentItem.id, productData);
          logger.info('Product updated successfully');
          showSnackbar('Product updated successfully', 'success');
        } catch (productError) {
          logger.warn('Product update failed, trying as inventory item', productError);
          // If product update fails, try as an inventory item
          try {
            // Use updateProduct instead of updateInventoryItem
            await inventoryService.updateProduct(currentItem.id, currentItem);
            showSnackbar('Inventory item updated successfully', 'success');
          } catch (itemError) {
            logger.error('Both update attempts failed:', itemError);
            showSnackbar('Failed to update item. Please try again.', 'error');
            setLoading(false);
            return;
          }
        }
      } else {
        try {
          // Try to create as a product first
          await inventoryService.createProduct(productData);
          logger.info('Product created successfully');
          showSnackbar('Product created successfully', 'success');
        } catch (productError) {
          logger.warn('Product creation failed, trying as inventory item', productError);
          // If product creation fails, try as an inventory item
          try {
            // Use createProduct instead of createInventoryItem
            await inventoryService.createProduct(currentItem);
            showSnackbar('Inventory item created successfully', 'success');
          } catch (itemError) {
            logger.error('Both creation attempts failed:', itemError);
            showSnackbar('Failed to create item. Please try again.', 'error');
            setLoading(false);
            return;
          }
        }
      }
      
      // Refresh the list and close the dialog
      await fetchItems();
      handleCloseDialog();
    } catch (error) {
      logger.error('Error saving item:', error);
      showSnackbar('Failed to save item. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        setLoading(true);
        
        // Try to delete as a product first
        try {
          await inventoryService.deleteProduct(id);
          logger.info('Product deleted successfully');
          showSnackbar('Product deleted successfully', 'success');
        } catch (productError) {
          // If product deletion fails, try as an inventory item
          logger.warn('Product deletion failed, trying as inventory item');
          try {
            // Use deleteProduct instead of deleteInventoryItem
            await inventoryService.deleteProduct(id);
            showSnackbar('Inventory item deleted successfully', 'success');
          } catch (itemError) {
            logger.error('Both deletion attempts failed:', itemError);
            showSnackbar('Failed to delete item. Please try again.', 'error');
            setLoading(false);
            return;
          }
        }
        
        // Refresh the list after deletion
        await fetchItems();
      } catch (error) {
        logger.error('Error deleting item:', error);
        showSnackbar('Failed to delete item. Please try again later.', 'error');
      } finally {
        setLoading(false);
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
              fetchItems(false);
            }}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant={useMockData ? "contained" : "outlined"}
            color={useMockData ? "secondary" : "primary"}
            onClick={() => {
              setUseMockData(!useMockData);
              fetchItems(!useMockData);
            }}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            {useMockData ? "Using Demo Data" : "Use Demo Data"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            Add New Item
          </Button>
        </Box>
      </Box>
      
      {(useMockData || apiUnavailable) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="bold">
            Using Demo Data
          </Typography>
          <Typography variant="body2">
            {apiUnavailable
              ? "The inventory API is currently unavailable. All data shown is demo data and changes will not be saved."
              : "You are viewing demo data. Changes will not be persisted to the database."}
          </Typography>
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {items.length === 0 ? (
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
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.sku || item.product_code || 'N/A'}</TableCell>
                  <TableCell>{item.description || 'No description'}</TableCell>
                  <TableCell>{item.quantity || item.stock_quantity || 0}</TableCell>
                  <TableCell>{item.reorder_level || 0}</TableCell>
                  <TableCell>
                    $
                    {typeof item.unit_price === 'number'
                      ? item.unit_price.toFixed(2)
                      : typeof item.price === 'number'
                      ? item.price.toFixed(2)
                      : parseFloat(item.unit_price || item.price || 0).toFixed(2)}
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
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{isEditing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            value={currentItem.name}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="sku"
            label="SKU"
            type="text"
            fullWidth
            value={currentItem.sku}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={currentItem.description}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="quantity"
            label="Quantity"
            type="number"
            fullWidth
            value={currentItem.quantity}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="reorder_level"
            label="Reorder Level"
            type="number"
            fullWidth
            value={currentItem.reorder_level}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="unit_price"
            label="Unit Price"
            type="number"
            fullWidth
            value={currentItem.unit_price}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryItemList;
