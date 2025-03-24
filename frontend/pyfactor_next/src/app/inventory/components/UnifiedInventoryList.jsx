import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress,
  Alert, Snackbar, Pagination, Chip, FormControlLabel, Switch,
  Grid, InputAdornment, Badge, Tab, Tabs, Divider, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Dialog
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

// Lazy load components for better initial load performance
const ProductTable = lazy(() => import('./ProductTable'));
const ProductGrid = lazy(() => import('./ProductGrid'));
const ProductForm = lazy(() => import('./ProductForm'));
const ProductStatsWidget = lazy(() => import('./ProductStatsWidget'));
const ProductDetailDialog = lazy(() => import('./ProductDetailDialog'));
const ProductBulkActions = lazy(() => import('./ProductBulkActions'));
const ProductImportDialog = lazy(() => import('./ProductImportDialog'));
const ProductExportDialog = lazy(() => import('./ProductExportDialog'));
const ProductFiltersPanel = lazy(() => import('./ProductFiltersPanel'));

/**
 * Unified Inventory List Component
 * Combines the best features of all inventory list implementations
 * with optimized performance and enhanced features
 */
const UnifiedInventoryList = ({ initialCreateForm = false }) => {
  // State for products and loading
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // State for pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // State for dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(initialCreateForm);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category_id: '',
    supplier_id: '',
    location_id: '',
    include_inactive: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // State for view options
  const [viewMode, setViewMode] = useState('table'); // 'table', 'grid'
  const [displayMode, setDisplayMode] = useState('standard'); // 'ultra', 'standard', 'detailed'

  // State for bulk actions
  const [selectedItems, setSelectedItems] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Initial data loading
  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [page, limit]); // Dependencies that trigger reload

  // Fetch products when page, limit, search or filters change
  useEffect(() => {
    fetchProducts();
  }, [page, limit, searchQuery, filters, displayMode]);
  
  // Effect for handling refresh after actions
  useEffect(() => {
    if (initialCreateForm) {
      logger.info('Opening create form from URL parameter');
    }
  }, [initialCreateForm]);

  // Fetch product statistics
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await unifiedInventoryService.getProductStats();
      setStatsData(data);
    } catch (error) {
      logger.error('Error fetching product stats:', error);
      setError('Failed to load product statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch products with current pagination, search and filters
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const params = {
        page,
        limit,
        search: searchQuery,
        view_mode: displayMode,
        ...filters
      };
      
      const response = await unifiedInventoryService.getProducts(params);
      
      setProducts(response.data || []);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotalItems(response.pagination?.total || 0);
      setError(null);
    } catch (error) {
      logger.error('Error fetching products:', error);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    unifiedInventoryService.clearProductCache();
    fetchStats();
    fetchProducts();
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page when search changes
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setFiltersApplied(Object.values(newFilters).some(value => 
      value !== '' && value !== false && value !== null));
    setPage(1); // Reset to first page when filters change
  };

  // Toggle filter panel
  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Handle display mode change
  const handleDisplayModeChange = (event, newMode) => {
    if (newMode !== null) {
      setDisplayMode(newMode);
    }
  };

  // Open form dialog for create/edit
  const handleOpenFormDialog = (item = null) => {
    setCurrentItem(item);
    setFormDialogOpen(true);
  };

  // Close form dialog
  const handleCloseFormDialog = (refreshData = false) => {
    setFormDialogOpen(false);
    setCurrentItem(null);
    
    if (refreshData) {
      handleRefresh();
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (id) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Close delete dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Delete a product
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await unifiedInventoryService.deleteProduct(itemToDelete);
      
      handleCloseDeleteDialog();
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: 'Product deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      logger.error('Error deleting product:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to delete product',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open detail dialog
  const handleOpenDetailDialog = (id) => {
    setDetailItem(id);
    setDetailDialogOpen(true);
  };

  // Close detail dialog
  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailItem(null);
  };

  // Toggle item selection for bulk actions
  const handleToggleSelect = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Select/deselect all items
  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedItems(products.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  // Open bulk actions menu
  const handleOpenBulkMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Close bulk actions menu
  const handleCloseBulkMenu = () => {
    setAnchorEl(null);
  };

  // Perform bulk delete
  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      handleCloseBulkMenu();
      
      const result = await unifiedInventoryService.bulkDeleteProducts(selectedItems);
      
      setSnackbar({
        open: true,
        message: `Successfully deleted ${result.success_count} products${
          result.failed_ids?.length ? `, failed to delete ${result.failed_ids.length}` : ''
        }`,
        severity: result.failed_ids?.length ? 'warning' : 'success'
      });
      
      setSelectedItems([]);
      handleRefresh();
    } catch (error) {
      logger.error('Error performing bulk delete:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to delete products',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Open import dialog
  const handleOpenImportDialog = () => {
    setImportDialogOpen(true);
  };

  // Close import dialog
  const handleCloseImportDialog = (refreshData = false) => {
    setImportDialogOpen(false);
    
    if (refreshData) {
      handleRefresh();
    }
  };

  // Open export dialog
  const handleOpenExportDialog = () => {
    setExportDialogOpen(true);
  };

  // Close export dialog
  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Memoized value to determine if any filters are applied
  const hasActiveFilters = useMemo(() => {
    return searchQuery !== '' || filtersApplied;
  }, [searchQuery, filtersApplied]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Statistics Widget */}
      <Suspense fallback={<Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>}>
        <ProductStatsWidget stats={statsData} loading={statsLoading} />
      </Suspense>

      {/* Action Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={8}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenFormDialog()}
              >
                Add Product
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={handleToggleFilters}
                color={filtersApplied ? "primary" : "inherit"}
              >
                Filters
              </Button>
              
              {selectedItems.length > 0 && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Badge badgeContent={selectedItems.length} color="primary">
                    <DeleteIcon />
                  </Badge>}
                  onClick={handleOpenBulkMenu}
                >
                  Bulk Actions
                </Button>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <Tooltip title="Import Products">
                <IconButton onClick={handleOpenImportDialog}>
                  <CloudUploadIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Export Products">
                <IconButton onClick={handleOpenExportDialog}>
                  <CloudDownloadIcon />
                </IconButton>
              </Tooltip>
              
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              
              <Tooltip title="Table View">
                <IconButton 
                  color={viewMode === 'table' ? 'primary' : 'default'}
                  onClick={() => handleViewModeChange('table')}
                >
                  <ViewListIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Grid View">
                <IconButton 
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  onClick={() => handleViewModeChange('grid')}
                >
                  <ViewModuleIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* Search Box */}
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            placeholder="Search products by name, code, or description..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <Box sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'gray' }}>✕</Box>
                  </IconButton>
                </InputAdornment>
              )
            }}
            size="small"
            sx={{ backgroundColor: 'white' }}
          />
        </Box>
        
        {/* Display Mode Tabs */}
        <Box sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={displayMode}
            onChange={handleDisplayModeChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ '& .MuiTab-root': { minWidth: 'auto', px: 2 } }}
          >
            <Tab value="ultra" label="Compact" icon={<ViewCompactIcon />} iconPosition="start" />
            <Tab value="standard" label="Standard" icon={<ViewListIcon />} iconPosition="start" />
            <Tab value="detailed" label="Detailed" icon={<ViewModuleIcon />} iconPosition="start" />
          </Tabs>
        </Box>
      </Paper>

      {/* Filters Panel */}
      {showFilters && (
        <Suspense fallback={<Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>}>
          <ProductFiltersPanel 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            onClose={handleToggleFilters} 
          />
        </Suspense>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {searchQuery && (
            <Chip 
              label={`Search: ${searchQuery}`} 
              onDelete={() => setSearchQuery('')}
              size="small"
            />
          )}
          
          {filters.category_id && (
            <Chip 
              label={`Category Filter`} 
              onDelete={() => handleFilterChange({...filters, category_id: ''})}
              size="small"
            />
          )}
          
          {filters.supplier_id && (
            <Chip 
              label={`Supplier Filter`} 
              onDelete={() => handleFilterChange({...filters, supplier_id: ''})}
              size="small"
            />
          )}
          
          {filters.location_id && (
            <Chip 
              label={`Location Filter`} 
              onDelete={() => handleFilterChange({...filters, location_id: ''})}
              size="small"
            />
          )}
          
          {filters.include_inactive && (
            <Chip 
              label="Including Inactive" 
              onDelete={() => handleFilterChange({...filters, include_inactive: false})}
              size="small"
            />
          )}
          
          <Button 
            size="small" 
            onClick={() => {
              setSearchQuery('');
              handleFilterChange({
                category_id: '',
                supplier_id: '',
                location_id: '',
                include_inactive: false
              });
            }}
          >
            Clear All
          </Button>
        </Box>
      )}

      {/* Loading Indicator */}
      {initialLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* No Products Message */}
          {products.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, backgroundColor: 'white', borderRadius: 1 }}>
              <Typography variant="h6" color="text.secondary">
                No products found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {hasActiveFilters 
                  ? 'Try changing your search or filters'
                  : 'Click "Add Product" to create your first product'}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Products Display */}
              <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>}>
                {viewMode === 'table' ? (
                  <ProductTable
                    products={products}
                    loading={loading}
                    displayMode={displayMode}
                    selectedItems={selectedItems}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onEdit={handleOpenFormDialog}
                    onDelete={handleOpenDeleteDialog}
                    onViewDetails={handleOpenDetailDialog}
                  />
                ) : (
                  <ProductGrid
                    products={products}
                    loading={loading}
                    displayMode={displayMode}
                    selectedItems={selectedItems}
                    onToggleSelect={handleToggleSelect}
                    onEdit={handleOpenFormDialog}
                    onDelete={handleOpenDeleteDialog}
                    onViewDetails={handleOpenDetailDialog}
                  />
                )}
              </Suspense>
              
              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {Math.min((page - 1) * limit + 1, totalItems)} - {Math.min(page * limit, totalItems)} of {totalItems} items
                </Typography>
                
                {totalPages > 1 && (
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                    disabled={loading}
                  />
                )}
              </Box>
            </>
          )}
        </>
      )}

      {/* Dialogs */}
      <Suspense fallback={null}>
        {/* Product Form Dialog */}
        {formDialogOpen && (
          <ProductForm
            open={formDialogOpen}
            onClose={handleCloseFormDialog}
            product={currentItem}
            isEdit={!!currentItem}
          />
        )}
        
        {/* Product Detail Dialog */}
        {detailDialogOpen && (
          <ProductDetailDialog
            open={detailDialogOpen}
            onClose={handleCloseDetailDialog}
            productId={detailItem}
            onEdit={handleOpenFormDialog}
          />
        )}
        
        {/* Import Dialog */}
        {importDialogOpen && (
          <ProductImportDialog
            open={importDialogOpen}
            onClose={handleCloseImportDialog}
          />
        )}
        
        {/* Export Dialog */}
        {exportDialogOpen && (
          <ProductExportDialog
            open={exportDialogOpen}
            onClose={handleCloseExportDialog}
            filters={filters}
            searchQuery={searchQuery}
          />
        )}
      </Suspense>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Confirm Delete</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Are you sure you want to delete this product? This action cannot be undone.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button 
              color="error" 
              variant="contained" 
              onClick={handleDeleteConfirm}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseBulkMenu}
      >
        <MenuItem onClick={handleBulkDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Delete Selected ({selectedItems.length})
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UnifiedInventoryList; 