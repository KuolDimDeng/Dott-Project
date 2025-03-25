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
  Tooltip,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import StorageIcon from '@mui/icons-material/Storage';
import CategoryIcon from '@mui/icons-material/Category';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StoreIcon from '@mui/icons-material/Store';
import BarcodeIcon from '@mui/icons-material/QrCode2';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

/**
 * ProductDetailDialog Component
 * Displays detailed information about a specific product
 */
const ProductDetailDialog = ({ open, onClose, productId, onEdit }) => {
  const theme = useTheme();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  
  // Fetch product details when dialog opens
  useEffect(() => {
    if (open && productId) {
      fetchProductDetails();
    }
  }, [open, productId]);
  
  // Fetch product details
  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This would normally fetch from the API using the product ID
      // For now, let's fetch all products and find the matching one
      const response = await unifiedInventoryService.getProducts();
      const products = response.data || [];
      
      // Find the product by ID
      const foundProduct = products.find(p => p.id === productId);
      
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      logger.error('Error fetching product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Format currency
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Handle edit button click
  const handleEdit = () => {
    onClose();
    onEdit(product);
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InventoryIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6">
              Product Details
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : product ? (
          <Box>
            {/* Product Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 3 }}>
              {/* Product Image */}
              <Box 
                sx={{ 
                  width: { xs: '100%', md: 250 }, 
                  height: 250, 
                  mr: { xs: 0, md: 3 },
                  mb: { xs: 2, md: 0 },
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    style={{ 
                      maxHeight: '100%', 
                      maxWidth: '100%', 
                      objectFit: 'contain' 
                    }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <InventoryIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5 }} />
                    <Typography variant="caption" color="textSecondary" display="block">
                      No image
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Product Summary */}
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {product.name}
                  </Typography>
                  
                  <Box>
                    {!product.is_active && (
                      <Chip 
                        label="Inactive" 
                        color="error" 
                        size="small" 
                        sx={{ mr: 1 }} 
                      />
                    )}
                    
                    {product.stock_quantity !== undefined && 
                     product.reorder_level !== undefined && 
                     product.stock_quantity < product.reorder_level && (
                      <Chip 
                        icon={<WarningIcon />} 
                        label="Low Stock" 
                        color="warning" 
                        size="small" 
                      />
                    )}
                  </Box>
                </Box>
                
                <Typography variant="body1" paragraph>
                  {product.description || 'No description available.'}
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BarcodeIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">
                        SKU: <strong>{product.product_code || 'N/A'}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CategoryIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">
                        Category: <strong>{product.category_name || 'Uncategorized'}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AttachMoneyIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">
                        Price: <strong>{formatCurrency(product.price)}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <InventoryIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">
                        Stock: <strong>{product.stock_quantity || 0}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Detailed Information */}
            <Grid container spacing={3}>
              {/* Inventory Information */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <StorageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    Inventory Details
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500, width: '40%' }}>
                            Stock Quantity
                          </TableCell>
                          <TableCell>
                            {product.stock_quantity !== undefined ? (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {product.stock_quantity}
                                {product.reorder_level !== undefined && 
                                 product.stock_quantity < product.reorder_level && (
                                  <Tooltip title="Below reorder level">
                                    <WarningIcon 
                                      color="warning" 
                                      fontSize="small" 
                                      sx={{ ml: 1 }} 
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                            ) : 'N/A'}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Reorder Level
                          </TableCell>
                          <TableCell>
                            {product.reorder_level !== undefined ? product.reorder_level : 'N/A'}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Location
                          </TableCell>
                          <TableCell>
                            {product.location_name || 'Default Location'}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Last Ordered
                          </TableCell>
                          <TableCell>
                            {product.last_ordered_date ? 
                              formatDate(product.last_ordered_date) : 'Never'}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Dimensions
                          </TableCell>
                          <TableCell>
                            {product.dimensions || 'N/A'}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Weight
                          </TableCell>
                          <TableCell>
                            {product.weight ? 
                              `${product.weight} ${product.weight_unit || 'kg'}` : 'N/A'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              
              {/* Pricing & Supplier Information */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachMoneyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    Pricing & Supplier
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500, width: '40%' }}>
                            Selling Price
                          </TableCell>
                          <TableCell>
                            {formatCurrency(product.price)}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Cost Price
                          </TableCell>
                          <TableCell>
                            {formatCurrency(product.cost_price)}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Profit Margin
                          </TableCell>
                          <TableCell>
                            {product.price && product.cost_price ? (
                              <Chip 
                                label={`${(((product.price - product.cost_price) / product.price) * 100).toFixed(2)}%`}
                                color="success"
                                size="small"
                              />
                            ) : 'N/A'}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Tax Rate
                          </TableCell>
                          <TableCell>
                            {product.tax_rate !== undefined ? 
                              `${product.tax_rate}%` : 'N/A'}
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Supplier
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocalShippingIcon 
                                fontSize="small" 
                                sx={{ mr: 0.5, color: 'text.secondary' }} 
                              />
                              {product.supplier_name || 'N/A'}
                            </Box>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell component="th" sx={{ fontWeight: 500 }}>
                            Barcode
                          </TableCell>
                          <TableCell>
                            {product.barcode || 'N/A'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              
              {/* System Information */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <InfoOutlinedIcon sx={{ mr: 1, fontSize: 18, color: theme.palette.text.secondary }} />
                    System Information
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarTodayIcon 
                          fontSize="small" 
                          sx={{ mr: 0.5, color: 'text.secondary' }} 
                        />
                        <Typography variant="body2" color="textSecondary">
                          Created: {formatDate(product.created_at)}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarTodayIcon 
                          fontSize="small" 
                          sx={{ mr: 0.5, color: 'text.secondary' }} 
                        />
                        <Typography variant="body2" color="textSecondary">
                          Updated: {formatDate(product.updated_at)}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="textSecondary">
                        ID: {product.id}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="textSecondary">
                        SKU: {product.product_code || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">Product not found</Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
        {product && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit Product
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetailDialog;