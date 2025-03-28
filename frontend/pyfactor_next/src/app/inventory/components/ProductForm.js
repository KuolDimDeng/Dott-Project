import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, FormControlLabel, Switch,
  Typography, Box, InputAdornment, CircularProgress,
  Alert, MenuItem, FormControl, InputLabel, Select,
  Divider, IconButton, Tooltip, Tabs, Tab, FormHelperText,
  useTheme, ThemeProvider, createTheme
} from '@mui/material';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorageIcon from '@mui/icons-material/Storage';
import DetailsIcon from '@mui/icons-material/Details';

/**
 * Enhanced Product Form Component
 * Provides a comprehensive form for creating and editing products
 * with validation, image upload support, and multi-section organization
 * 
 * Updated to follow MUI best practices for input handling
 */
const ProductForm = ({ open, onClose, product = null, isEdit = false }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Form field values
  const [formData, setFormData] = useState({
    name: '',
    product_code: '',
    description: '',
    price: '',
    cost_price: '',
    tax_rate: '',
    stock_quantity: '',
    reorder_level: '',
    category_id: '',
    supplier_id: '',
    location_id: '',
    is_active: true,
    weight: '',
    weight_unit: 'kg',
    dimensions: '',
    barcode: '',
    sku: '',
    image_file: null
  });
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  
  // Create a theme override specifically for this form to ensure inputs work correctly
  const formTheme = createTheme({
    components: {
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          InputLabelProps: {
            shrink: true,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            '&.MuiInputBase-root': {
              position: 'relative',
              zIndex: 5,
            },
            '& input': {
              color: 'inherit',
              caretColor: 'black',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
            },
          },
          input: {
            padding: '14px 12px',
          },
        },
      },
    },
  });
  
  // Initialize form data when editing a product
  useEffect(() => {
    if (isEdit && product) {
      const initialData = {
        ...product,
        price: product.price || '',
        cost_price: product.cost_price || '',
        tax_rate: product.tax_rate || '',
        stock_quantity: product.stock_quantity || '',
        reorder_level: product.reorder_level || '',
        image_file: null
      };
      
      setFormData(initialData);
      
      // Set image preview if product has an image
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
    }
    
    // Load reference data
    fetchReferenceData();
  }, [isEdit, product]);
  
  // Fetch categories, suppliers, and locations
  const fetchReferenceData = async () => {
    try {
      const categoriesData = await unifiedInventoryService.getCategories();
      setCategories(categoriesData || []);
      
      // These would be implemented in the actual service
      // const suppliersData = await unifiedInventoryService.getSuppliers();
      // setSuppliers(suppliersData || []);
      
      // const locationsData = await unifiedInventoryService.getLocations();
      // setLocations(locationsData || []);
      
      // Mock data for now
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
      logger.error('Error fetching reference data:', error);
      setError('Failed to load reference data');
    }
  };
  
  // Handle input changes
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    
    // Handle switch/checkbox inputs
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // For numeric fields, ensure they're valid numbers
    if (['price', 'cost_price', 'tax_rate', 'stock_quantity', 'reorder_level', 'weight'].includes(name)) {
      // Allow empty value or valid number
      if (value === '' || (!isNaN(parseFloat(value)) && value >= 0)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
      return;
    }
    
    // Handle other inputs
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field if exists
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle image upload
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setValidationErrors(prev => ({
        ...prev,
        image_file: 'Please upload a valid image file (JPEG, PNG, GIF, WEBP)'
      }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors(prev => ({
        ...prev,
        image_file: 'Image file size should be less than 5MB'
      }));
      return;
    }
    
    // Update form data and preview
    setFormData(prev => ({
      ...prev,
      image_file: file
    }));
    
    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Clear validation error
    setValidationErrors(prev => ({
      ...prev,
      image_file: null
    }));
  };
  
  // Remove image
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image_file: null
    }));
    setImagePreview(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    // Required fields
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Product name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Product name should be less than 100 characters';
    }
    
    if (formData.price !== '' && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0)) {
      errors.price = 'Price must be a positive number';
    }
    
    if (formData.cost_price !== '' && (isNaN(parseFloat(formData.cost_price)) || parseFloat(formData.cost_price) < 0)) {
      errors.cost_price = 'Cost price must be a positive number';
    }
    
    if (formData.tax_rate !== '' && (isNaN(parseFloat(formData.tax_rate)) || parseFloat(formData.tax_rate) < 0 || parseFloat(formData.tax_rate) > 100)) {
      errors.tax_rate = 'Tax rate must be between 0 and 100';
    }
    
    if (formData.stock_quantity !== '' && (isNaN(parseInt(formData.stock_quantity)) || parseInt(formData.stock_quantity) < 0)) {
      errors.stock_quantity = 'Stock quantity must be a non-negative integer';
    }
    
    if (formData.reorder_level !== '' && (isNaN(parseInt(formData.reorder_level)) || parseInt(formData.reorder_level) < 0)) {
      errors.reorder_level = 'Reorder level must be a non-negative integer';
    }
    
    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description should be less than 1000 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form first
    if (!validateForm()) {
      // Find the tab containing the first error
      const errorFields = Object.keys(validationErrors);
      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0];
        
        // Basic tab mapping - customize based on your form fields
        const basicInfoFields = ['name', 'product_code', 'description', 'category_id', 'image_file'];
        const pricingFields = ['price', 'cost_price', 'tax_rate'];
        const inventoryFields = ['stock_quantity', 'reorder_level', 'supplier_id', 'location_id'];
        
        if (basicInfoFields.includes(firstErrorField)) {
          setActiveTab(0);
        } else if (pricingFields.includes(firstErrorField)) {
          setActiveTab(1);
        } else if (inventoryFields.includes(firstErrorField)) {
          setActiveTab(2);
        } else {
          setActiveTab(3);
        }
      }
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create or update product
      if (isEdit) {
        await unifiedInventoryService.updateProduct(product.id, formData);
      } else {
        await unifiedInventoryService.createProduct(formData);
      }
      
      // Close dialog and refresh list
      onClose(true);
    } catch (error) {
      logger.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ThemeProvider theme={formTheme}>
      <Dialog 
        open={open} 
        onClose={loading ? undefined : () => !loading && onClose()}
        fullWidth
        maxWidth="md"
        disableEscapeKeyDown={loading}
        className="product-form"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InventoryIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab icon={<DetailsIcon />} label="Basic Info" />
            <Tab icon={<LocalOfferIcon />} label="Pricing" />
            <Tab icon={<InventoryIcon />} label="Inventory" />
            <Tab icon={<StorageIcon />} label="Additional Details" />
          </Tabs>
          
          {/* Basic Info Tab */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Product Name"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={handleChange}
                  error={!!validationErrors.name}
                  helperText={validationErrors.name}
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      color: 'black',
                      caretColor: 'black',
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="product_code"
                  label="Product Code"
                  fullWidth
                  value={formData.product_code}
                  onChange={handleChange}
                  error={!!validationErrors.product_code}
                  helperText={validationErrors.product_code || "Leave blank to auto-generate"}
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      color: 'black',
                      caretColor: 'black',
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    label="Category"
                    disabled={loading}
                    InputProps={{
                      slotProps: {
                        htmlInput: {
                          'data-fixed-by-global-debugger': 'true',
                          style: {
                            color: 'black',
                            caretColor: 'black'
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  error={!!validationErrors.description}
                  helperText={validationErrors.description}
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Product Image
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {imagePreview ? (
                    <Box sx={{ position: 'relative', width: 150, height: 150 }}>
                      <img
                        src={imagePreview}
                        alt="Product"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: theme.shape.borderRadius
                        }}
                      />
                      <IconButton
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          }
                        }}
                        onClick={handleRemoveImage}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box 
                      sx={{ 
                        width: 150, 
                        height: 150, 
                        border: '1px dashed #ccc',
                        borderRadius: theme.shape.borderRadius,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        backgroundColor: '#f9f9f9'
                      }}
                    >
                      <PhotoCamera color="action" />
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                        No image
                      </Typography>
                    </Box>
                  )}
                  
                  <Box>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="image-upload"
                      ref={fileInputRef}
                      type="file"
                      onChange={handleImageChange}
                      disabled={loading}
                    />
                    <label htmlFor="image-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<PhotoCamera />}
                        disabled={loading}
                      >
                        {imagePreview ? 'Change Image' : 'Upload Image'}
                      </Button>
                    </label>
                    
                    {validationErrors.image_file && (
                      <FormHelperText error>
                        {validationErrors.image_file}
                      </FormHelperText>
                    )}
                    
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                      Max size: 5MB. Formats: JPEG, PNG, GIF, WEBP
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
          
          {/* Pricing Tab */}
          {activeTab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="price"
                  label="Selling Price"
                  fullWidth
                  value={formData.price}
                  onChange={handleChange}
                  error={!!validationErrors.price}
                  helperText={validationErrors.price}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="cost_price"
                  label="Cost Price"
                  fullWidth
                  value={formData.cost_price}
                  onChange={handleChange}
                  error={!!validationErrors.cost_price}
                  helperText={validationErrors.cost_price}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="tax_rate"
                  label="Tax Rate (%)"
                  fullWidth
                  value={formData.tax_rate}
                  onChange={handleChange}
                  error={!!validationErrors.tax_rate}
                  helperText={validationErrors.tax_rate}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ 
                  bgcolor: 'background.paper', 
                  p: 2, 
                  borderRadius: theme.shape.borderRadius,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    <InfoOutlinedIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    Pricing Information
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    The selling price is what customers pay. Cost price is what you pay to acquire the item. 
                    The system will calculate profit margins based on these values.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
          
          {/* Inventory Tab */}
          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="stock_quantity"
                  label="Stock Quantity"
                  type="number"
                  fullWidth
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  error={!!validationErrors.stock_quantity}
                  helperText={validationErrors.stock_quantity}
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="reorder_level"
                  label="Reorder Level"
                  type="number"
                  fullWidth
                  value={formData.reorder_level}
                  onChange={handleChange}
                  error={!!validationErrors.reorder_level}
                  helperText={validationErrors.reorder_level || "Get alerted when stock falls below this level"}
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Supplier</InputLabel>
                  <Select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleChange}
                    label="Supplier"
                    disabled={loading}
                    InputProps={{
                      slotProps: {
                        htmlInput: {
                          'data-fixed-by-global-debugger': 'true',
                          style: {
                            color: 'black',
                            caretColor: 'black'
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleChange}
                    label="Location"
                    disabled={loading}
                    InputProps={{
                      slotProps: {
                        htmlInput: {
                          'data-fixed-by-global-debugger': 'true',
                          style: {
                            color: 'black',
                            caretColor: 'black'
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={handleChange}
                      name="is_active"
                      color="primary"
                      disabled={loading}
                    />
                  }
                  label="Product is active"
                />
                <Typography variant="caption" color="textSecondary" display="block">
                  Inactive products won't appear in sales catalogs
                </Typography>
              </Grid>
            </Grid>
          )}
          
          {/* Additional Details Tab */}
          {activeTab === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="sku"
                  label="SKU"
                  fullWidth
                  value={formData.sku}
                  onChange={handleChange}
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="barcode"
                  label="Barcode"
                  fullWidth
                  value={formData.barcode}
                  onChange={handleChange}
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="weight"
                  label="Weight"
                  fullWidth
                  value={formData.weight}
                  onChange={handleChange}
                  InputProps={{
                    endAdornment: (
                      <FormControl variant="standard" sx={{ minWidth: 70 }}>
                        <Select
                          name="weight_unit"
                          value={formData.weight_unit}
                          onChange={handleChange}
                          disabled={loading}
                          InputProps={{
                            slotProps: {
                              htmlInput: {
                                'data-fixed-by-global-debugger': 'true',
                                style: {
                                  color: 'black',
                                  caretColor: 'black'
                                }
                              }
                            }
                          }}
                        >
                          <MenuItem value="kg">kg</MenuItem>
                          <MenuItem value="g">g</MenuItem>
                          <MenuItem value="lb">lb</MenuItem>
                          <MenuItem value="oz">oz</MenuItem>
                        </Select>
                      </FormControl>
                    ),
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="dimensions"
                  label="Dimensions (L x W x H)"
                  fullWidth
                  value={formData.dimensions}
                  onChange={handleChange}
                  placeholder="e.g., 10 x 5 x 3 cm"
                  disabled={loading}
                  InputProps={{
                    slotProps: {
                      htmlInput: {
                        'data-fixed-by-global-debugger': 'true',
                        style: {
                          color: 'black',
                          caretColor: 'black'
                        }
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Custom Fields
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Additional custom fields can be added based on your specific needs.
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => onClose()} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

export default ProductForm; 