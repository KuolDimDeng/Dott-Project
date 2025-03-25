import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import NewReleasesIcon from '@mui/icons-material/NewReleases';

/**
 * Product statistics widget component
 * Displays key metrics about the inventory
 */
const ProductStatsWidget = ({ stats, loading }) => {
  if (loading) {
    return null; // Return nothing while loading to avoid showing spinners
  }

  if (!stats) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography color="textSecondary">
            No statistics available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        {/* Total Products */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <InventoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="subtitle2">
                  Total Products
                </Typography>
              </Box>
              <Typography variant="h4">
                {stats.total_products}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="textSecondary">
                Total items in inventory
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Items */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color={stats.low_stock_count > 0 ? "error" : "disabled"} sx={{ mr: 1 }} />
                <Typography 
                  color={stats.low_stock_count > 0 ? "error" : "textSecondary"} 
                  variant="subtitle2"
                >
                  Low Stock Items
                </Typography>
              </Box>
              <Typography 
                variant="h4" 
                color={stats.low_stock_count > 0 ? "error" : "inherit"}
              >
                {stats.low_stock_count}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="textSecondary">
                Items below reorder level
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Inventory Value */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoneyIcon color="success" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="subtitle2">
                  Total Value
                </Typography>
              </Box>
              <Typography variant="h4">
                ${parseFloat(stats.total_value).toFixed(2)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="textSecondary">
                Total inventory value
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Average Price */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="info" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="subtitle2">
                  Average Price
                </Typography>
              </Box>
              <Typography variant="h4">
                ${parseFloat(stats.avg_price).toFixed(2)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="textSecondary">
                Average product price
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Newest Product */}
      {stats.newest_product && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <NewReleasesIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="subtitle1">
                Newest Product
              </Typography>
              <Chip 
                label="New" 
                color="secondary" 
                size="small" 
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">Name</Typography>
                <Typography variant="body1">{stats.newest_product.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">SKU</Typography>
                <Typography variant="body1">{stats.newest_product.product_code || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Price</Typography>
                <Typography variant="body1">${parseFloat(stats.newest_product.price).toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Stock</Typography>
                <Typography variant="body1">{stats.newest_product.stock_quantity}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ProductStatsWidget;