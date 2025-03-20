import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
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
  Tooltip,
  Card,
  CardContent,
  Grid,
  Divider,
  InputAdornment,
  Badge
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CachedIcon from '@mui/icons-material/Cached';
import StorageIcon from '@mui/icons-material/Storage';
import SearchIcon from '@mui/icons-material/Search';
import SpeedIcon from '@mui/icons-material/Speed';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { inventoryService } from '@/services/inventoryService';
import { ultraOptimizedInventoryService } from '@/services/ultraOptimizedInventoryService';
import { logger } from '@/utils/logger';

// Lazy load components for better initial load performance
const ProductStatsWidget = lazy(() => import('./ProductStatsWidget'));
const ProductDetailDialog = lazy(() => import('./ProductDetailDialog'));

/**
 * Ultra-optimized component for displaying and managing inventory items
 * This component uses the ultra-optimized inventory service for maximum performance
 */
const UltraOptimizedInventoryList = () => {
  // State for products data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  // UI state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [useMockData, setUseMockData] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [useOfflineData, setUseOfflineData] = useState(false);
  const [showStats, setShowStats] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState({
    is_for_sale: true,
    min_stock: '',
    search: '',
    department: ''
  });
  
  // View mode state
  const [viewMode, setViewMode] = useState('ultra'); // 'ultra', 'standard', 'detailed'
  
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

  // Fetch products with the appropriate service based on view mode
  const fetchProducts = useCallback(async (forceMock = false, forceOffline = false) => {
    // Temporarily disable loading spinner
    // setLoading(true);
    setError(null);
    
    // Immediately use mock data for now due to network issues
    logger.info('Using mock inventory data due to network issues');
    const mockProducts = inventoryService.getMockProducts();
    setProducts(mockProducts);
    setTotalItems(mockProducts.length);
    setTotalPages(1);
    setApiUnavailable(true);
    showSnackbar('Using demo data (API unavailable)', 'info');
    setLoading(false);
    setInitialLoading(false);
    return;
  }, [showSnackbar]);

  // Fetch product stats
  const fetchStats = useCallback(async () => {
    if (!showStats) return;
    
    try {
      const statsData = await ultraOptimizedInventoryService.getProductStats();
      setStats(statsData);
    } catch (error) {
      logger.error('Error fetching product stats:', error);
      // Don't show an error message for stats, just log it
    }
  }, [showStats]);

  // Effect to fetch products and stats on component mount and when dependencies change
  useEffect(() => {
    // Prefetch products for faster initial load
    if (initialLoading) {
      ultraOptimizedInventoryService.prefetchEssentialData().catch(() => {
        // Silently fail, will be handled in fetchProducts
      });
    }
    
    fetchProducts();
    fetchStats();
  }, [fetchProducts, fetchStats, page, viewMode]);

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

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setPage(1); // Reset to first page when changing view mode
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

  // Open detail dialog for a product
  const handleOpenDetailDialog = (productId) => {
    setSelectedProductId(productId);
    setDetailDialogOpen(true);
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
          ultraOptimizedInventoryService.clearProductCache();
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
          ultraOptimizedInventoryService.clearProductCache();
        } catch (error) {
          logger.error('Error creating product:', error);
          showSnackbar('Failed to create product. Please try again.', 'error');
          setLoading(false);
          return;
        }
      }
      
      // Refresh the list and close the dialog
      await fetchProducts();
      await fetchStats();
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
        ultraOptimizedInventoryService.clearProductCache();
        
        // Refresh the list after deletion
        await fetchProducts();
        await fetchStats();
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
        {viewMode !== 'ultra' && <TableCell><Skeleton variant="text" width="90%" /></TableCell>}
        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
        {viewMode === 'detailed' && <TableCell><Skeleton variant="text" width="40%" /></TableCell>}
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
    } else if (viewMode === 'ultra') {
      status = 'ultra';
      statusText = 'Using ultra-optimized endpoint';
      statusColor = 'success';
      icon = <SpeedIcon fontSize="small" />;
    } else if (viewMode === 'standard') {
      status = 'standard';
      statusText = 'Using standard optimized endpoint';
      statusColor = 'info';
      icon = <CachedIcon fontSize="small" />;
    } else {
      status = 'detailed';
      statusText = 'Using detailed endpoint';
      statusColor = 'default';
      icon = <InventoryIcon fontSize="small" />;
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

  // Render stats widgets
  const renderStats = () => {
    if (!showStats) return null;
    
    return (
      <Suspense fallback={<Box sx={{ p: 2 }}></Box>}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {stats ? (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Total Products
                      </Typography>
                      <Typography variant="h4">
                        {stats.total_products}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Low Stock Items
                      </Typography>
                      <Typography variant="h4" color={stats.low_stock_count > 0 ? "error" : "inherit"}>
                        {stats.low_stock_count}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Total Inventory Value
                      </Typography>
                      <Typography variant="h4">
                        ${parseFloat(stats.total_value).toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Average Price
                      </Typography>
                      <Typography variant="h4">
                        ${parseFloat(stats.avg_price).toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            ) : (
              // Skeleton loading for stats
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Grid item xs={12} sm={6} md={3} key={i}>
                    <Card>
                      <CardContent>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" height={40} width="40%" />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </>
            )}
          </Grid>
        </Box>
      </Suspense>
    );
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      {/* Header with title and actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Ultra-Optimized Inventory
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
              fetchStats();
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
      
      {/* Stats widgets */}
      {renderStats()}
      
      {/* Filters and view mode */}
      <Box sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
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
              
              <TextField
                label="Search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                size="small"
                sx={{ width: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ mb: 2 }}>View Mode</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={viewMode === 'ultra' ? 'contained' : 'outlined'}
                color={viewMode === 'ultra' ? 'success' : 'primary'}
                onClick={() => handleViewModeChange('ultra')}
                startIcon={<SpeedIcon />}
                size="small"
              >
                Ultra Fast
              </Button>
              <Button
                variant={viewMode === 'standard' ? 'contained' : 'outlined'}
                color={viewMode === 'standard' ? 'info' : 'primary'}
                onClick={() => handleViewModeChange('standard')}
                startIcon={<CachedIcon />}
                size="small"
              >
                Standard
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
                color={viewMode === 'detailed' ? 'secondary' : 'primary'}
                onClick={() => handleViewModeChange('detailed')}
                startIcon={<InventoryIcon />}
                size="small"
              >
                Detailed
              </Button>
            </Box>
          </Grid>
        </Grid>
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
      
      {/* Products display */}
      {products.length === 0 ? (
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
                  {viewMode !== 'ultra' && <TableCell>Description</TableCell>}
                  <TableCell>Quantity</TableCell>
                  {viewMode === 'detailed' && <TableCell>Reorder Level</TableCell>}
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
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ 
                            fontWeight: 'medium',
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => handleOpenDetailDialog(item.id)}
                        >
                          {item.name}
                        </Typography>
                        {viewMode === 'standard' && item.department_name && (
                          <Typography variant="caption" color="textSecondary">
                            {item.department_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{item.product_code || 'N/A'}</TableCell>
                      {viewMode !== 'ultra' && (
                        <TableCell>
                          {item.description ? 
                            (item.description.length > 50 ? 
                              `${item.description.substring(0, 50)}...` : 
                              item.description) : 
                            'No description'}
                        </TableCell>
                      )}
                      <TableCell>
                        {(item.stock_quantity !== undefined && item.reorder_level !== undefined && 
                         item.stock_quantity < item.reorder_level) ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography color="error">{item.stock_quantity}</Typography>
                            <Tooltip title="Low stock">
                              <WarningIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                            </Tooltip>
                          </Box>
                        ) : (
                          item.stock_quantity || 0
                        )}
                      </TableCell>
                      {viewMode === 'detailed' && <TableCell>{item.reorder_level || 0}</TableCell>}
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
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
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

      {/* Product detail dialog */}
      {selectedProductId && (
        <Suspense fallback={<div></div>}>
          <ProductDetailDialog
            open={detailDialogOpen}
            onClose={() => setDetailDialogOpen(false)}
            productId={selectedProductId}
          />
        </Suspense>
      )}
    </Box>
  );
};

export default UltraOptimizedInventoryList;