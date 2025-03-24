import React, { useState, useEffect } from 'react';
import {
  Paper, Typography, Box, FormControl, InputLabel, Select,
  MenuItem, FormControlLabel, Switch, Button, Grid,
  TextField, InputAdornment, IconButton, useTheme
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

/**
 * ProductFiltersPanel Component
 * Provides a panel with filters for the product list
 */
const ProductFiltersPanel = ({ filters, onFilterChange, onClose }) => {
  const theme = useTheme();
  
  // State
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Local state for filters
  const [localFilters, setLocalFilters] = useState({ ...filters });
  
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    price_min: '',
    price_max: '',
    stock_min: '',
    stock_max: ''
  });
  
  // Fetch reference data on mount
  useEffect(() => {
    fetchReferenceData();
  }, []);
  
  // Update local filters when props change
  useEffect(() => {
    setLocalFilters({ ...filters });
  }, [filters]);
  
  // Fetch categories, suppliers, and locations
  const fetchReferenceData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesData = await unifiedInventoryService.getCategories();
      setCategories(categoriesData || []);
      
      // Mock data for suppliers and locations until those endpoints are ready
      setSuppliers([
        { id: 1, name: 'Supplier A' },
        { id: 2, name: 'Supplier B' },
        { id: 3, name: 'Supplier C' },
      ]);
      
      setLocations([
        { id: 1, name: 'Warehouse A' },
        { id: 2, name: 'Warehouse B' },
        { id: 3, name: 'Showroom' },
        { id: 4, name: 'Online Store' },
      ]);
    } catch (error) {
      logger.error('Error fetching filter reference data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value, checked, type } = event.target;
    
    setLocalFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle advanced filter change
  const handleAdvancedFilterChange = (event) => {
    const { name, value } = event.target;
    
    // Allow only numbers or empty string
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setAdvancedFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    // Combine basic and advanced filters
    const combinedFilters = {
      ...localFilters
    };
    
    // Add advanced filters if they have values
    if (advancedFilters.price_min) {
      combinedFilters.price_min = advancedFilters.price_min;
    }
    
    if (advancedFilters.price_max) {
      combinedFilters.price_max = advancedFilters.price_max;
    }
    
    if (advancedFilters.stock_min) {
      combinedFilters.stock_min = advancedFilters.stock_min;
    }
    
    if (advancedFilters.stock_max) {
      combinedFilters.stock_max = advancedFilters.stock_max;
    }
    
    onFilterChange(combinedFilters);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setLocalFilters({
      category_id: '',
      supplier_id: '',
      location_id: '',
      include_inactive: false
    });
    
    setAdvancedFilters({
      price_min: '',
      price_max: '',
      stock_min: '',
      stock_max: ''
    });
  };
  
  // Check if any filter is applied
  const hasFilters = () => {
    return Object.values(localFilters).some(value => 
      value !== '' && value !== false && value !== null) ||
      Object.values(advancedFilters).some(value => 
        value !== '' && value !== null);
  };
  
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterListIcon sx={{ mr: 1 }} />
          Filter Products
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      
      <Grid container spacing={2}>
        {/* Basic Filters */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select
              name="category_id"
              value={localFilters.category_id}
              onChange={handleFilterChange}
              label="Category"
              disabled={loading}
            >
              <MenuItem value="">
                <em>All Categories</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Supplier</InputLabel>
            <Select
              name="supplier_id"
              value={localFilters.supplier_id}
              onChange={handleFilterChange}
              label="Supplier"
              disabled={loading}
            >
              <MenuItem value="">
                <em>All Suppliers</em>
              </MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Location</InputLabel>
            <Select
              name="location_id"
              value={localFilters.location_id}
              onChange={handleFilterChange}
              label="Location"
              disabled={loading}
            >
              <MenuItem value="">
                <em>All Locations</em>
              </MenuItem>
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControlLabel
            control={
              <Switch
                checked={localFilters.include_inactive}
                onChange={handleFilterChange}
                name="include_inactive"
                color="primary"
              />
            }
            label="Include Inactive Products"
          />
        </Grid>
        
        {/* Advanced Filters */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Advanced Filters
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            name="price_min"
            label="Min Price"
            fullWidth
            size="small"
            value={advancedFilters.price_min}
            onChange={handleAdvancedFilterChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            name="price_max"
            label="Max Price"
            fullWidth
            size="small"
            value={advancedFilters.price_max}
            onChange={handleAdvancedFilterChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            name="stock_min"
            label="Min Stock"
            fullWidth
            size="small"
            value={advancedFilters.stock_min}
            onChange={handleAdvancedFilterChange}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            name="stock_max"
            label="Max Stock"
            fullWidth
            size="small"
            value={advancedFilters.stock_max}
            onChange={handleAdvancedFilterChange}
          />
        </Grid>
        
        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DeleteSweepIcon />}
              onClick={handleResetFilters}
              disabled={!hasFilters()}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ProductFiltersPanel; 