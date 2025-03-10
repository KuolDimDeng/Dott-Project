import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { inventoryService } from '@/services/inventoryService';
import { ultraOptimizedInventoryService } from '@/services/ultraOptimizedInventoryService';
import { logger } from '@/utils/logger';

/**
 * Product detail dialog component
 * Shows detailed information about a product
 */
const ProductDetailDialog = ({ open, onClose, productId }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useOptimizedEndpoint, setUseOptimizedEndpoint] = useState(true);

  // Fetch product details when dialog opens
  useEffect(() => {
    if (open && productId) {
      fetchProductDetails();
    }
  }, [open, productId, useOptimizedEndpoint]);

  // Fetch product details
  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      let productData;
      
      if (useOptimizedEndpoint) {
        // Try to get product from optimized endpoint first
        try {
          productData = await ultraOptimizedInventoryService.getProductByCode(productId);
        } catch (optimizedError) {
          logger.warn('Optimized endpoint failed, falling back to standard endpoint:', optimizedError);
          // Fall back to standard endpoint
          productData = await inventoryService.getProducts();
          productData = productData.find(p => p.id === productId);
        }
      } else {
        // Use standard endpoint directly
        productData = await inventoryService.getProducts();
        productData = productData.find(p => p.id === productId);
      }

      if (productData) {
        setProduct(productData);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      logger.error('Error fetching product details:', error);
      setError('Failed to load product details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render loading state
  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="text" width="60%" />
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="text" height={30} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Render error state
  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Error</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={fetchProductDetails}
          >
            Retry
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // If no product data
  if (!product) {
    return null;
  }

  // Check if stock is low
  const isLowStock = product.stock_quantity < product.reorder_level;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{product.name}</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Product summary */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip 
                icon={<InventoryIcon />} 
                label={`SKU: ${product.product_code || 'N/A'}`} 
                variant="outlined" 
              />
              <Chip 
                icon={isLowStock ? <WarningIcon /> : <CheckCircleIcon />} 
                label={`Stock: ${product.stock_quantity}`} 
                color={isLowStock ? "error" : "success"} 
              />
              <Chip 
                icon={<LocalShippingIcon />} 
                label={`Reorder Level: ${product.reorder_level}`} 
                variant="outlined" 
              />
              {product.created_at && (
                <Chip 
                  icon={<CalendarTodayIcon />} 
                  label={`Added: ${formatDate(product.created_at)}`} 
                  variant="outlined" 
                />
              )}
              {product.is_for_sale !== undefined && (
                <Chip 
                  label={product.is_for_sale ? "For Sale" : "Not For Sale"} 
                  color={product.is_for_sale ? "primary" : "default"} 
                />
              )}
            </Box>
          </Grid>

          {/* Product details */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Product Details</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Price
                    </TableCell>
                    <TableCell align="right">
                      ${parseFloat(product.price || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  {product.department_name && (
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Department
                      </TableCell>
                      <TableCell align="right">
                        {product.department_name}
                      </TableCell>
                    </TableRow>
                  )}
                  {product.salesTax !== undefined && (
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Sales Tax
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(product.salesTax || 0).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  )}
                  {product.updated_at && (
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Last Updated
                      </TableCell>
                      <TableCell align="right">
                        {formatDate(product.updated_at)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Inventory status */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Inventory Status</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Current Stock
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {product.stock_quantity}
                        {isLowStock && (
                          <Tooltip title="Low stock">
                            <WarningIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Reorder Level
                    </TableCell>
                    <TableCell align="right">
                      {product.reorder_level}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Stock Value
                    </TableCell>
                    <TableCell align="right">
                      ${(parseFloat(product.price || 0) * (product.stock_quantity || 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Status
                    </TableCell>
                    <TableCell align="right">
                      {isLowStock ? (
                        <Chip size="small" label="Low Stock" color="error" />
                      ) : (
                        <Chip size="small" label="In Stock" color="success" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Description</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2">
                {product.description || 'No description available.'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setUseOptimizedEndpoint(!useOptimizedEndpoint)}
          color="secondary"
        >
          {useOptimizedEndpoint ? "Use Standard Endpoint" : "Use Optimized Endpoint"}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetailDialog;