import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Typography, Box, Checkbox, Tooltip,
  Skeleton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * ProductTable Component
 * Displays products in a tabular format with various display modes
 */
const ProductTable = ({
  products,
  loading,
  displayMode = 'standard',
  selectedItems = [],
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  // Calculate if all items are selected
  const allSelected = products.length > 0 && products.every(item => 
    selectedItems.includes(item.id));
  
  // Calculate if some items are selected
  const someSelected = products.length > 0 && products.some(item => 
    selectedItems.includes(item.id)) && !allSelected;
  
  // Handle selection of all items
  const handleSelectAll = () => {
    onSelectAll(!allSelected);
  };
  
  // Render loading skeletons
  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell padding="checkbox">
          <Skeleton variant="rectangular" width={24} height={24} />
        </TableCell>
        <TableCell><Skeleton variant="text" width={150} /></TableCell>
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        {displayMode !== 'ultra' && <TableCell><Skeleton variant="text" width={200} /></TableCell>}
        <TableCell><Skeleton variant="text" width={60} /></TableCell>
        {displayMode === 'detailed' && <TableCell><Skeleton variant="text" width={60} /></TableCell>}
        <TableCell><Skeleton variant="text" width={80} /></TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={30} height={30} />
            <Skeleton variant="circular" width={30} height={30} />
            <Skeleton variant="circular" width={30} height={30} />
          </Box>
        </TableCell>
      </TableRow>
    ));
  };
  
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={someSelected}
                checked={allSelected}
                onChange={handleSelectAll}
                disabled={products.length === 0 || loading}
              />
            </TableCell>
            <TableCell>Name</TableCell>
            <TableCell>SKU/Code</TableCell>
            {displayMode !== 'ultra' && <TableCell>Description</TableCell>}
            <TableCell>Quantity</TableCell>
            {displayMode === 'detailed' && <TableCell>Reorder Level</TableCell>}
            <TableCell>Price</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            renderSkeletons()
          ) : (
            products.map((item) => (
              <TableRow key={item.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onChange={() => onToggleSelect(item.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography
                      variant="body2"
                      sx={{ 
                        fontWeight: 'medium',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={() => onViewDetails(item.id)}
                    >
                      {item.name}
                    </Typography>
                    
                    {displayMode === 'detailed' && item.category_name && (
                      <Typography variant="caption" color="textSecondary">
                        {item.category_name}
                      </Typography>
                    )}
                    
                    {!item.is_active && (
                      <Typography variant="caption" color="error">
                        Inactive
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{item.product_code || 'N/A'}</TableCell>
                
                {displayMode !== 'ultra' && (
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
                
                {displayMode === 'detailed' && <TableCell>{item.reorder_level || 0}</TableCell>}
                
                <TableCell>
                  ${typeof item.price === 'number'
                    ? item.price.toFixed(2)
                    : parseFloat(item.price || 0).toFixed(2)}
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
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
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
          
          {products.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={displayMode === 'detailed' ? 8 : (displayMode === 'ultra' ? 6 : 7)} align="center">
                <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                  No products found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductTable; 