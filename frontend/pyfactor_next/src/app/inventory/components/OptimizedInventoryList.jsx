import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Snackbar,
  Pagination,
  Chip,
  FormControlLabel,
  Switch,
  Skeleton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CachedIcon from '@mui/icons-material/Cached';
import StorageIcon from '@mui/icons-material/Storage';
import { inventoryService } from '@/services/inventoryService';
import { optimizedInventoryService } from '@/services/optimizedInventoryService';
import { logger } from '@/utils/logger';

/**
 * Optimized component for displaying and managing inventory items
 * This component uses the optimized inventory service for better performance
 */
const OptimizedInventoryList = () => {
  // State for products data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    name: '',
    product_code: '',
    description: '',
    stock_quantity: 0,
    reorder_level: 0,
    price: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [useOfflineData, setUseOfflineData] = useState(false);
  const [useOptimizedEndpoint, setUseOptimizedEndpoint] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState({
    is_for_sale: true,
    min_stock: '',
  });
  
  const theme = useTheme();

  // Show snackbar notification
  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Fetch products with optimized service
  const fetchProducts = useCallback(async (forceMock = false, forceOffline = false) => {
    setLoading(true);
    setError(null);
    
    // If mock data is enabled or forced, use mock data
    if (useMockData || forceMock) {
      setTimeout(() => {
        logger.info('Using mock inventory data');
        const mockProducts = inventoryService.getMockProducts();
        setProducts(mockProducts);
        setTotalItems(mockProducts.length);
        setTotalPages(1);
        showSnackbar('Using demo data (API unavailable or slow to respond)', 'info');
        setLoading(false);
        setInitialLoading(false);
      }, 500); // Simulate network delay
      return;
    }
    
    // If offline mode is enabled or forced, use offline data
    if (useOfflineData || forceOffline) {
      setTimeout(() => {
        logger.info('Using offline inventory data');
        const offlineProducts = optimizedInventoryService.getOfflineProducts();
        setProducts(offlineProducts);
        setTotalItems(offlineProducts.length);
        setTotalPages(1);
        showSnackbar('Using offline data (working offline)', 'info');
        setLoading(false);
        setInitialLoading(false);
      }, 300);
      return;
    }
    
    try {
      // Use optimized endpoint if enabled, otherwise fall back to regular endpoint
      if (useOptimizedEndpoint) {
        try {
          logger.debug('Fetching products from optimized service');
          
          // Prepare filter options
          const options = {
            page: page,
            ...filters
          };
          
          // Filter out empty values
          Object.keys(options).forEach(key => {
            if (options[key] === '' || options[key] === undefined) {
              delete options[key];
            }
          });
          
          const response = await optimizedInventoryService.getOptimizedProducts(options);
          
          if (response && response.results) {
            setProducts(response.results);
            setTotalItems(response.count || 0);
            setTotalPages(Math.ceil((response.count || 0) / 20)); // 20 is the page size in the backend
            
            // Store data for offline use
            optimizedInventoryService.storeProductsOffline(response.results);
            
            showSnackbar('Products loaded successfully', 'success');
            setLoading(false);
            setInitialLoading(false);
            return;
          }
        } catch (optimizedError) {
          logger.warn('Optimized endpoint failed, falling back to regular endpoint:', optimizedError);
          // Fall through to try regular endpoint
        }
      }
      
      // Fall back to regular endpoint
      try {
        logger.debug('Fetching products from regular inventory service');
        const products = await inventoryService.getProducts();
        
        if (products && Array.isArray(products)) {
          setProducts(products);
          setTotalItems(products.length);
          setTotalPages(1); // No pagination in regular endpoint
          
          // Store data for offline use
          optimizedInventoryService.storeProductsOffline(products);
          
          showSnackbar('Products loaded successfully (using standard endpoint)', 'success');
          setLoading(false);
          setInitialLoading(false);
          return;
        }
      } catch (regularError) {
        logger.warn('Regular endpoint failed, trying offline data:', regularError);
        
        // Try offline data
        const offlineProducts = optimizedInventoryService.getOfflineProducts();
        if (offlineProducts && offlineProducts.length > 0) {
          setProducts(offlineProducts);
          setTotalItems(offlineProducts.length);
          setTotalPages(1);
          setUseOfflineData(true);
          showSnackbar('Using offline data (API unavailable)', 'warning');
          setLoading(false);
          setInitialLoading(false);
          return;
        }
        
        // If no offline data, fall back to mock data
        setApiUnavailable(true);
        fetchProducts(true); // Call again with forceMock=true
        return;
      }
    } catch (error) {
      logger.error('Error fetching products:', error);
      
      // Try offline data first
      const offlineProducts = optimizedInventoryService.getOfflineProducts();
      if (offlineProducts && offlineProducts.length > 0) {
        setProducts(offlineProducts);
        setTotalItems(offlineProducts.length);
        setTotalPages(1);
        setUseOfflineData(true);
        showSnackbar('Using offline data (API unavailable)', 'warning');
        setLoading(false);
        setInitialLoading(false);
        return;
      }
      
      // Fall back to mock data if offline data is not available
      setApiUnavailable(true);
      fetchProducts(true); // Call again with forceMock=true
    }
  }, [useMockData, useOfflineData, useOptimizedEndpoint, page, filters, showSnackbar]);

  // Effect to fetch products on component mount and when dependencies change
  useEffect(() => {
    // Prefetch products for faster initial load
    if (initialLoading) {
      optimizedInventoryService.prefetchProducts().catch(() => {
        // Silently fail, will be handled in fetchProducts
      });
    }
    
    fetchProducts();
  }, [fetchProducts, page, useOptimizedEndpoint]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Reset to first page when filters change
    setPage(1);
  };

  // Open dialog for adding or editing an item
  const handleOpenDialog = (item = null) => {
    if (item) {
      setCurrentItem({
        ...item,
        // Ensure all required fields are present
        name: item.name || '',
        product_code: item.product_code || '',
        description: item.description || '',
        stock_quantity: item.stock_quantity || 0,
        reorder_level: item.reorder_level || 0,
        price: item.price || 0,
      });
      setIsEditing(true);
    } else {
      setCurrentItem({
        name: '',
        product_code: '',
        description: '',
        stock_quantity: 0,
        reorder_level: 0,
        price: 0,
        is_for_sale: true,
      });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentItem({
      name: '',
      product_code: '',
      description: '',
      stock_quantity: 0,
      reorder_level: 0,
      price: 0,
      is_for_sale: true,
    });
    setIsEditing(false);
  };

  // Handle input change in dialog
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentItem((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit form for creating or updating an item
  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!currentItem.name) {
        showSnackbar('Name is required', 'error');
        return;
      }
      
      // Prepare product data
      const productData = {
        name: currentItem.name,
        description: currentItem.description || '',
        price: parseFloat(currentItem.price) || 0,
        product_code: currentItem.product_code || undefined,
        stock_quantity: parseInt(currentItem.stock_quantity, 10) || 0,
        reorder_level: parseInt(currentItem.reorder_level, 10) || 0,
        is_for_sale: currentItem.is_for_sale !== false
      };
      
      logger.info('Submitting product data:', productData);
      setLoading(true);
      
      if (isEditing) {
        try {
          // Update product
          await inventoryService.updateProduct(currentItem.id, productData);
          logger.info('Product updated successfully');
          showSnackbar('Product updated successfully', 'success');
          
          // Clear cache to ensure fresh data
          optimizedInventoryService.clearProductCache();
        } catch (error) {
          logger.error('Error updating product:', error);
          showSnackbar('Failed to update product. Please try again.', 'error');
          setLoading(false);
          return;
        }
      } else {
        try {
          // Create product
          await inventoryService.createProduct(productData);
          logger.info('Product created successfully');
          showSnackbar('Product created successfully', 'success');
          
          // Clear cache to ensure fresh data
          optimizedInventoryService.clearProductCache();
        } catch (error) {
          logger.error('Error creating product:', error);
          showSnackbar('Failed to create product. Please try again.', 'error');
          setLoading(false);
          return;
        }
      }
      
      // Refresh the list and close the dialog
      await fetchProducts();
      handleCloseDialog();
    } catch (error) {
      logger.error('Error saving product:', error);
      showSnackbar('Failed to save product. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete an item
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setLoading(true);
        
        await inventoryService.deleteProduct(id);
        logger.info('Product deleted successfully');
        showSnackbar('Product deleted successfully', 'success');
        
        // Clear cache to ensure fresh data
        optimizedInventoryService.clearProductCache();
        
        // Refresh the list after deletion
        await fetchProducts();
      } catch (error) {
        logger.error('Error deleting product:', error);
        showSnackbar('Failed to delete product. Please try again later.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Render loading skeletons for initial load
  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton variant="text" width="80%" /></TableCell>
        <TableCell><Skeleton variant="text" width="60%" /></TableCell>
        <TableCell><Skeleton variant="text" width="90%" /></TableCell>
        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
        <TableCell><Skeleton variant="text" width="50%" /></TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
          </Box>
        </TableCell>
      </TableRow>
    ));
  };

  // Status indicator component
  const StatusIndicator = () => {
    let status = 'online';
    let statusText = 'Using live data';
    let statusColor = 'success';
    let icon = <CachedIcon fontSize="small" />;
    
    if (useMockData) {
      status = 'demo';
      statusText = 'Using demo data';
      statusColor = 'secondary';
      icon = <StorageIcon fontSize="small" />;
    } else if (useOfflineData) {
      status = 'offline';
      statusText = 'Using offline data';
      statusColor = 'warning';
      icon = <StorageIcon fontSize="small" />;
    } else if (!useOptimizedEndpoint) {
      status = 'standard';
      statusText = 'Using standard endpoint';
      statusColor = 'info';
      icon = <CachedIcon fontSize="small" />;
    }
    
    return (
      <Tooltip title={statusText}>
        <Chip
          icon={icon}
          label={status}
          color={statusColor}
          size="small"
          sx={{ ml: 1 }}
        />
      </Tooltip>
    );
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      {/* Header with title and actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Inventory Items
          <StatusIndicator />
        </Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setApiUnavailable(false);
              setUseOfflineData(false);
              fetchProducts(false);
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
              setUseOfflineData(false);
              fetchProducts(!useMockData);
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
      
      {/* Filters */}
      <Box sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: 1 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={filters.is_for_sale}
                onChange={handleFilterChange}
                name="is_for_sale"
              />
            }
            label="For Sale Only"
          />
          
          <TextField
            label="Min Stock"
            name="min_stock"
            type="number"
            value={filters.min_stock}
            onChange={handleFilterChange}
            size="small"
            sx={{ width: 120 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={useOptimizedEndpoint}
                onChange={(e) => setUseOptimizedEndpoint(e.target.checked)}
                color="success"
              />
            }
            label="Use Optimized Endpoint"
          />
        </Box>
      </Box>
      
      {/* Status alerts */}
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
      
      {useOfflineData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="bold">
            Using Offline Data
          </Typography>
          <Typography variant="body2">
            You are viewing cached offline data. This data may not be up-to-date with the latest changes.
          </Typography>
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {loading && initialLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, backgroundColor: 'white', borderRadius: 1 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading inventory data... This may take a moment.
          </Typography>
        </Box>
      ) : products.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, backgroundColor: 'white', borderRadius: 1 }}>
          <Typography variant="h6" color="text.secondary">
            No inventory items found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Add New Item" to create your first inventory item
          </Typography>
        </Box>
      ) : (
        <>
          {/* Products table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Reorder Level</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && !initialLoading ? (
                  renderSkeletons()
                ) : (
                  products.map((item) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                disabled={loading}
              />
            </Box>
          )}
          
          {/* Item count */}
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {products.length} of {totalItems} items
            </Typography>
          </Box>
        </>
      )}
      
      {/* Snackbar for notifications */}
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

      {/* Dialog for adding/editing items */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
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
            required
          />
          <TextField
            margin="dense"
            name="product_code"
            label="SKU"
            type="text"
            fullWidth
            value={currentItem.product_code}
            onChange={handleInputChange}
            helperText="Leave blank to auto-generate"
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
            name="stock_quantity"
            label="Quantity"
            type="number"
            fullWidth
            value={currentItem.stock_quantity}
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
            name="price"
            label="Price"
            type="number"
            fullWidth
            value={currentItem.price}
            onChange={handleInputChange}
          />
          <FormControlLabel
            control={
              <Switch
                checked={currentItem.is_for_sale !== false}
                onChange={handleInputChange}
                name="is_for_sale"
              />
            }
            label="Available for Sale"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OptimizedInventoryList;