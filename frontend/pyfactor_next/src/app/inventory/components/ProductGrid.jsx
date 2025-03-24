import React from 'react';
import {
  Grid, Card, CardMedia, CardContent, Typography, Box,
  Checkbox, IconButton, Skeleton, Tooltip, Chip, CardActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningIcon from '@mui/icons-material/Warning';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

/**
 * ProductGrid Component
 * Displays products in a grid format with cards
 */
const ProductGrid = ({
  products,
  loading,
  displayMode = 'standard',
  selectedItems = [],
  onToggleSelect,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  // Render loading skeletons
  const renderSkeletons = () => {
    return Array(8).fill(0).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ position: 'relative' }}>
            <Skeleton variant="rectangular" width="100%" height={200} />
            <Box sx={{ position: 'absolute', top: 10, left: 10 }}>
              <Skeleton variant="circular" width={30} height={30} />
            </Box>
          </Box>
          <CardContent sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="80%" height={28} />
            <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            <Skeleton variant="text" width={60} height={24} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="circular" width={30} height={30} />
              <Skeleton variant="circular" width={30} height={30} />
              <Skeleton variant="circular" width={30} height={30} />
            </Box>
          </CardActions>
        </Card>
      </Grid>
    ));
  };
  
  return (
    <Grid container spacing={2}>
      {loading ? (
        renderSkeletons()
      ) : (
        products.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: (theme) => theme.shadows[6],
              }
            }}>
              {/* Checkbox for selection */}
              <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '50%',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                  }}
                />
              </Box>
              
              {/* Product status indicators */}
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {!item.is_active && (
                  <Chip 
                    size="small" 
                    label="Inactive" 
                    color="error" 
                    sx={{ fontSize: '0.7rem' }} 
                  />
                )}
                
                {item.stock_quantity !== undefined && 
                 item.reorder_level !== undefined && 
                 item.stock_quantity < item.reorder_level && (
                  <Chip 
                    size="small" 
                    icon={<WarningIcon />} 
                    label="Low Stock" 
                    color="warning" 
                    sx={{ fontSize: '0.7rem' }} 
                  />
                )}
              </Box>
              
              {/* Product Image */}
              <CardMedia
                component="div"
                sx={{
                  height: 200,
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => onViewDetails(item.id)}
              >
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    style={{ 
                      maxHeight: '100%', 
                      maxWidth: '100%', 
                      objectFit: 'contain' 
                    }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <InventoryIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      No image
                    </Typography>
                  </Box>
                )}
              </CardMedia>
              
              {/* Product Details */}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography 
                  variant="h6" 
                  component="h2" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 500, 
                    fontSize: '1rem',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                  onClick={() => onViewDetails(item.id)}
                >
                  {item.name}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <LocalOfferIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                    ${typeof item.price === 'number'
                      ? item.price.toFixed(2)
                      : parseFloat(item.price || 0).toFixed(2)}
                  </Typography>
                </Box>
                
                {displayMode !== 'ultra' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <InventoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                      Stock: {item.stock_quantity || 0}
                    </Typography>
                  </Box>
                )}
                
                {displayMode === 'detailed' && (
                  <>
                    {item.category_name && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ display: 'flex', alignItems: 'center' }}
                        >
                          <CategoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                          {item.category_name}
                        </Typography>
                      </Box>
                    )}
                    
                    {item.product_code && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        SKU: {item.product_code}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
              
              {/* Actions */}
              <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                <Tooltip title="View Details">
                  <IconButton size="small" onClick={() => onViewDetails(item.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Edit Product">
                  <IconButton size="small" onClick={() => onEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Delete Product">
                  <IconButton size="small" onClick={() => onDelete(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))
      )}
      
      {products.length === 0 && !loading && (
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', p: 4, backgroundColor: 'white', borderRadius: 1 }}>
            <Typography variant="h6" color="text.secondary">
              No products found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try changing your search or filters
            </Typography>
          </Box>
        </Grid>
      )}
    </Grid>
  );
};

export default ProductGrid; 