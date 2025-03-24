import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress, Alert,
  Radio, RadioGroup, FormControlLabel, FormControl,
  FormLabel, Checkbox, FormGroup, useTheme, IconButton,
  Divider
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

/**
 * ProductExportDialog Component
 * Provides options for exporting products to different formats
 */
const ProductExportDialog = ({ open, onClose, filters = {}, searchQuery = '' }) => {
  const theme = useTheme();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [format, setFormat] = useState('csv');
  const [exportFields, setExportFields] = useState({
    basic: true,
    pricing: true,
    inventory: true,
    categories: true,
    suppliers: true,
    locations: true,
    dimensions: false,
    metadata: false
  });
  const [applyCurrentFilters, setApplyCurrentFilters] = useState(true);
  
  // Handle format change
  const handleFormatChange = (event) => {
    setFormat(event.target.value);
  };
  
  // Handle export field change
  const handleExportFieldChange = (event) => {
    setExportFields({
      ...exportFields,
      [event.target.name]: event.target.checked
    });
  };
  
  // Select/deselect all fields
  const handleSelectAll = (selected) => {
    const newFields = {};
    
    Object.keys(exportFields).forEach(key => {
      newFields[key] = selected;
    });
    
    setExportFields(newFields);
  };
  
  // Handle current filters toggle
  const handleApplyFiltersChange = (event) => {
    setApplyCurrentFilters(event.target.checked);
  };
  
  // Handle export
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare export options
      const exportOptions = {
        format,
        fields: Object.keys(exportFields).filter(key => exportFields[key]),
        filters: applyCurrentFilters ? {
          ...filters,
          search: searchQuery
        } : {}
      };
      
      // Export products
      const blob = await unifiedInventoryService.exportProducts(
        format,
        applyCurrentFilters ? { ...filters, search: searchQuery } : {}
      );
      
      // Create download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Close dialog
      onClose();
    } catch (error) {
      logger.error('Error exporting products:', error);
      setError('Failed to export products. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if any field is selected
  const hasSelectedFields = Object.values(exportFields).some(value => value);
  
  // Check if all fields are selected
  const allFieldsSelected = Object.values(exportFields).every(value => value);
  
  return (
    <Dialog
      open={open}
      onClose={!loading ? onClose : undefined}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Export Products
          </Typography>
          {!loading && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body2" paragraph>
          Export your products data in different formats. You can customize what information to include.
        </Typography>
        
        {/* Export Format */}
        <Box sx={{ mb: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Export Format</FormLabel>
            <RadioGroup
              row
              name="format"
              value={format}
              onChange={handleFormatChange}
            >
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="excel" control={<Radio />} label="Excel" />
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
            </RadioGroup>
          </FormControl>
        </Box>
        
        {/* Export Fields */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <FormLabel component="legend">Fields to Export</FormLabel>
            <Box>
              <Button 
                size="small" 
                onClick={() => handleSelectAll(true)}
                disabled={allFieldsSelected}
              >
                Select All
              </Button>
              <Button 
                size="small" 
                onClick={() => handleSelectAll(false)}
                disabled={!hasSelectedFields}
              >
                Deselect All
              </Button>
            </Box>
          </Box>
          
          <FormGroup>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.basic}
                    onChange={handleExportFieldChange}
                    name="basic"
                  />
                }
                label="Basic Info (Name, Code, Description)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.pricing}
                    onChange={handleExportFieldChange}
                    name="pricing"
                  />
                }
                label="Pricing Info (Price, Cost, Tax)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.inventory}
                    onChange={handleExportFieldChange}
                    name="inventory"
                  />
                }
                label="Inventory Info (Stock, Reorder Level)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.categories}
                    onChange={handleExportFieldChange}
                    name="categories"
                  />
                }
                label="Categories"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.suppliers}
                    onChange={handleExportFieldChange}
                    name="suppliers"
                  />
                }
                label="Suppliers"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.locations}
                    onChange={handleExportFieldChange}
                    name="locations"
                  />
                }
                label="Locations"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.dimensions}
                    onChange={handleExportFieldChange}
                    name="dimensions"
                  />
                }
                label="Dimensions & Weight"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFields.metadata}
                    onChange={handleExportFieldChange}
                    name="metadata"
                  />
                }
                label="Metadata (Created/Updated Dates)"
              />
            </Box>
          </FormGroup>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Current Filters */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={applyCurrentFilters}
                onChange={handleApplyFiltersChange}
                name="applyCurrentFilters"
              />
            }
            label="Apply current search & filters"
          />
          
          {applyCurrentFilters && (searchQuery || Object.values(filters).some(v => v)) && (
            <Box sx={{ 
              mt: 1, 
              p: 1.5, 
              backgroundColor: theme.palette.background.default,
              borderRadius: 1,
              border: '1px solid',
              borderColor: theme.palette.divider
            }}>
              <Typography variant="caption" component="div" color="textSecondary">
                Current filters that will be applied:
              </Typography>
              
              <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                {searchQuery && (
                  <Typography variant="caption" component="li">
                    Search: "{searchQuery}"
                  </Typography>
                )}
                
                {filters.category_id && (
                  <Typography variant="caption" component="li">
                    Category filter
                  </Typography>
                )}
                
                {filters.supplier_id && (
                  <Typography variant="caption" component="li">
                    Supplier filter
                  </Typography>
                )}
                
                {filters.location_id && (
                  <Typography variant="caption" component="li">
                    Location filter
                  </Typography>
                )}
                
                {filters.include_inactive && (
                  <Typography variant="caption" component="li">
                    Including inactive products
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExport}
          disabled={loading || !hasSelectedFields}
          startIcon={loading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
        >
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductExportDialog; 