'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ModernFormLayout from '@/app/components/ModernFormLayout';

const ProductManagement = ({ salesContext = false, mode, newProduct: isNewProduct = false }) => {
  // Determine initial tab based on mode
  const initialTab = mode === 'create' || isNewProduct ? 0 : 2;
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    is_for_sale: true,
    is_for_rent: false,
    salestax: '',
    stock_quantity: '',
    reorder_level: '',
    height: '',
    width: '',
    height_unit: 'cm',
    width_unit: 'cm',
    weight: '',
    weight_unit: 'kg',
  });
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdProductId, setCreatedProductId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/inventory/products/');
      setProducts(response.data);
    } catch (error) {
      let errorMessage = 'Error fetching products';
      if (error.response) {
        errorMessage += ` (${error.response.status})`;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    // Reset editing state when switching tabs
    if (newValue === 0) {
      setIsEditing(false);
    }
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value, checked, type } = event.target;
    
    if (isEditing) {
      setEditedProduct((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    } else {
      setNewProduct((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post('/api/inventory/products/', newProduct);
      toast.success('Product created successfully! You can now print a QR code for this product.');
      setNewProduct({
        name: '',
        description: '',
        price: '',
        is_for_sale: true,
        is_for_rent: false,
        salestax: '',
        stock_quantity: '',
        reorder_level: '',
        height: '',
        width: '',
        height_unit: 'cm',
        width_unit: 'cm',
        weight: '',
        weight_unit: 'kg',
      });
      
      // Set the created product ID and open success dialog
      setCreatedProductId(response.data.id);
      setSuccessDialogOpen(true);
      
      fetchProducts();
      // We don't automatically switch to List tab so user can see the success dialog
    } catch (error) {
      let errorMessage = 'Error creating product';
      if (error.response) {
        errorMessage += ` (${error.response.status})`;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessDialog = () => {
    setSuccessDialogOpen(false);
    setActiveTab(2); // Now switch to List tab
  };

  const handlePrintQRCode = () => {
    // Implement QR code printing logic here
    window.open(`/dashboard/products/qrcode/${createdProductId}`, '_blank');
    setSuccessDialogOpen(false);
    setActiveTab(2); // Switch to List tab after printing
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setActiveTab(1);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProduct({ ...selectedProduct });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProduct(null);
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.patch(
        `/api/inventory/products/${selectedProduct.id}/`,
        editedProduct
      );
      setSelectedProduct(response.data);
      setIsEditing(false);
      fetchProducts();
      toast.success('Product updated successfully');
    } catch (error) {
      let errorMessage = 'Error updating product';
      if (error.response) {
        errorMessage += ` (${error.response.status})`;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`/api/inventory/products/${selectedProduct.id}/`);
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      setActiveTab(2);
    } catch (error) {
      toast.error('Error deleting product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  // Create Product Form
  const renderCreateProductForm = () => {
    // Using useEffect in a render function is not ideal, so we'll handle this another way
    // Simply ensure isEditing is false when rendering this component
    if (isEditing) setIsEditing(false);
    
    return (
      <ModernFormLayout 
        title="Create New Product" 
        subtitle="Add a new product to your inventory"
        onSubmit={handleCreateProduct}
        isLoading={isSubmitting}
        submitLabel="Create Product"
      >
        <Grid item xs={12}>
          <Alert 
            severity="info" 
            variant="outlined"
            icon={<QrCodeIcon />}
            sx={{ mb: 3 }}
          >
            After creating your product, you'll be able to print a QR code for quick scanning and inventory management.
          </Alert>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            label="Product Name"
            name="name"
            value={newProduct.name}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            placeholder="Enter product name"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Price"
            name="price"
            type="number"
            value={newProduct.price}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            placeholder="0.00"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            name="description"
            value={newProduct.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="Enter product description"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Stock Quantity"
            name="stock_quantity"
            type="number"
            value={newProduct.stock_quantity}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            placeholder="0"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Reorder Level"
            name="reorder_level"
            type="number"
            value={newProduct.reorder_level}
            onChange={handleInputChange}
            fullWidth
            variant="outlined"
            placeholder="0"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
            Product Options
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={newProduct.is_for_sale}
                onChange={handleInputChange}
                name="is_for_sale"
                color="primary"
              />
            }
            label="Available for Sale"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={newProduct.is_for_rent}
                onChange={handleInputChange}
                name="is_for_rent"
                color="primary"
              />
            }
            label="Available for Rent"
          />
        </Grid>
      </ModernFormLayout>
    );
  };

  // Simplified Product Details Form
  const renderProductDetailsForm = () => {
    if (!selectedProduct) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No product selected
          </Typography>
        </Box>
      );
    }

    return (
      <ModernFormLayout 
        title={isEditing ? "Edit Product" : "Product Details"} 
        subtitle={`Product Code: ${selectedProduct.product_code || 'N/A'}`}
        onSubmit={e => {
          e.preventDefault();
          if (isEditing) handleSaveEdit();
        }}
        isLoading={isSubmitting}
        submitLabel="Save Changes"
        footer={
          isEditing ? (
            <Button 
              variant="outlined" 
              onClick={handleCancelEdit}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
          ) : (
            <Box>
              <Button 
                variant="outlined" 
                onClick={handleEdit}
                startIcon={<EditIcon />}
                sx={{ mr: 2 }}
              >
                Edit
              </Button>
              <Button 
                variant="outlined" 
                color="error"
                onClick={handleDelete}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            </Box>
          )
        }
      >
        <Grid item xs={12} md={6}>
          <TextField
            label="Product Name"
            name="name"
            value={isEditing ? editedProduct.name : selectedProduct.name}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            disabled={!isEditing}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Price"
            name="price"
            type="number"
            value={isEditing ? editedProduct.price : selectedProduct.price}
            onChange={handleInputChange}
            fullWidth
            required
            variant="outlined"
            disabled={!isEditing}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            name="description"
            value={isEditing ? editedProduct.description : selectedProduct.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            disabled={!isEditing}
          />
        </Grid>
      </ModernFormLayout>
    );
  };

  // Simplified Product List
  const renderProductList = () => (
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          mb: 4
        }}
      >
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Products
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
            />
            
            <Button 
              variant="contained" 
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setActiveTab(0)}
            >
              New Product
            </Button>
          </Box>
        </Box>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : products.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No products found
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => setActiveTab(0)}
            >
              Create New Product
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.filter(product => 
                  product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  product.description?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell onClick={() => handleProductSelect(product)}>
                      {product.name}
                    </TableCell>
                    <TableCell onClick={() => handleProductSelect(product)}>
                      ${parseFloat(product.price).toFixed(2)}
                    </TableCell>
                    <TableCell onClick={() => handleProductSelect(product)}>
                      {product.stock_quantity || 0}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleProductSelect(product)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => {
                          setSelectedProduct(product);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );

  // Reset editing state when tab changes
  useEffect(() => {
    if (activeTab === 0) setIsEditing(false);
  }, [activeTab]);

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab label="Create" />
          <Tab label="Details" disabled={!selectedProduct} />
          <Tab label="List" />
        </Tabs>
      </Paper>

      {activeTab === 0 && renderCreateProductForm()}
      {activeTab === 1 && renderProductDetailsForm()}
      {activeTab === 2 && renderProductList()}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this product? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            disabled={isSubmitting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Product Created Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseSuccessDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Product Created Successfully!</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <QrCodeIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <DialogContentText align="center">
              Your product has been created and added to your inventory. 
              Would you like to print a QR code for this product now?
            </DialogContentText>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              QR codes make it easy to quickly scan and identify products when managing inventory,
              processing sales, or conducting stock checks.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center', gap: 2 }}>
          <Button 
            onClick={handleCloseSuccessDialog} 
            color="inherit"
            variant="outlined"
          >
            Skip for Now
          </Button>
          <Button 
            onClick={handlePrintQRCode} 
            color="primary"
            variant="contained"
            startIcon={<QrCodeIcon />}
          >
            Print QR Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductManagement; 