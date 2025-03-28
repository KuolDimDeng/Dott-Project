'use client';
import React, { useState, useEffect } from 'react';
// Import Tailwind components
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField,
  FormControl,
  InputLabel,
  Checkbox,
  Alert,
  CircularProgress
} from '@/components/ui/TailwindComponents';

// Keep advanced MUI components for now that may not have Tailwind equivalents
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import { DataGrid } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import { axiosInstance } from '@/lib/axiosConfig';
import PropTypes from 'prop-types';

// Styled component for modern form layout
const ModernFormLayout = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.mode === 'dark' ? '#1a2027' : '#fff',
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  '& h3': {
    margin: 0,
    fontWeight: 600,
    fontSize: '1.25rem',
  },
  '& .statusBar': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  '& .statusTag': {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  '& .statusTag.active': {
    backgroundColor: '#ecfdf5',
    color: '#047857',
  },
  '& .statusTag.inactive': {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
  },
  '& .formActions': {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(3),
    gap: theme.spacing(2),
  },
}));

// Create a fallback checkbox component in case MUI Checkbox fails to load
const FallbackCheckbox = ({ checked, onChange, name }) => {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      name={name}
      style={{ 
        width: '18px', 
        height: '18px',
        marginRight: '8px'
      }}
    />
  );
};

// Component for tabbed product management
const ProductManagement = ({ isNewProduct, newProduct: isNewProductProp, product, onUpdate, onCancel }) => {
  // Support both isNewProduct and newProduct props for backward compatibility
  const isCreatingNewProduct = isNewProduct || isNewProductProp || false;

  // Determine initial tab based on mode
  const initialTab = isCreatingNewProduct ? 0 : 2;
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editedProduct, setEditedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdProductId, setCreatedProductId] = useState(null);
  const [isBarcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [currentBarcodeProduct, setCurrentBarcodeProduct] = useState(null);
  const router = useRouter();

  // State for individual form fields - more reliable than a single object
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [forSale, setForSale] = useState(true);
  const [forRent, setForRent] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');

  // For edited product state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editForSale, setEditForSale] = useState(true);
  const [editForRent, setEditForRent] = useState(false);
  const [editStockQuantity, setEditStockQuantity] = useState('');
  const [editReorderLevel, setEditReorderLevel] = useState('');

  // Check if Checkbox is available from MUI
  const [checkboxComponent, setCheckboxComponent] = useState(null);
  
  useEffect(() => {
    // Try to use MUI Checkbox, fallback to custom component if not available
    if (typeof Checkbox !== 'undefined') {
      setCheckboxComponent(() => Checkbox);
    } else {
      console.warn('MUI Checkbox not available, using fallback');
      setCheckboxComponent(() => FallbackCheckbox);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 2) {
      fetchProducts();
    }
  }, [activeTab]);

  // Initialize edit form when editing a product
  useEffect(() => {
    if (editedProduct) {
      setEditName(editedProduct.name || '');
      setEditDescription(editedProduct.description || '');
      setEditPrice(editedProduct.price || '');
      setEditForSale(editedProduct.for_sale !== false);
      setEditForRent(!!editedProduct.for_rent);
      setEditStockQuantity(editedProduct.stock_quantity || '');
      setEditReorderLevel(editedProduct.reorder_level || '');
    }
  }, [editedProduct]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/inventory/products/');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
      console.error('Error fetching products:', error);
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

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Prepare data to submit
      const productData = {
        name,
        description,
        price,
        for_sale: forSale,
        for_rent: forRent,
        stock_quantity: stockQuantity,
        reorder_level: reorderLevel
      };
      
      // Here you would typically call your API
      // const response = await createProduct(productData);
      
      // Success handling
      toast.success("Product created successfully!");
      
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setForSale(true);
      setForRent(false);
      setStockQuantity('');
      setReorderLevel('');
      
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);
      
      // Prepare edited product data
      const updatedProduct = {
        ...editedProduct,
        name: editName,
        description: editDescription,
        price: editPrice,
        for_sale: editForSale,
        for_rent: editForRent,
        stock_quantity: editStockQuantity,
        reorder_level: editReorderLevel
      };
      
      await axiosInstance.put(`/api/inventory/products/${editedProduct.id}/`, updatedProduct);
      
      // Show success message
      toast.success('Product updated successfully!');
      
      // Refresh the products list and reset editing state
      fetchProducts();
      setIsEditing(false);
      setEditedProduct(null);
    } catch (error) {
      // Handle errors
      const errorMessage = error.response?.data?.message || 'An error occurred while updating the product';
      toast.error(errorMessage);
      console.error('Error updating product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/api/inventory/products/${id}/`);
      
      // Show success message
      toast.success('Product deleted successfully!');
      
      // Refresh the products list
      fetchProducts();
    } catch (error) {
      // Handle errors
      const errorMessage = error.response?.data?.message || 'An error occurred while deleting the product';
      toast.error(errorMessage);
      console.error('Error deleting product:', error);
    }
  };

  const handleEditClick = (product) => {
    setEditedProduct({ ...product });
    setSelectedProduct(product);
    setIsEditing(true);
    setActiveTab(0); // Switch to "Create" tab for editing
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setActiveTab(1); // Switch to "Details" tab
  };

  const handleGenerateBarcode = (product) => {
    setCurrentBarcodeProduct(product);
    setBarcodeDialogOpen(true);
  };

  const dataGridColumns = [
    { field: 'product_code', headerName: 'Code', flex: 0.5 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'price', headerName: 'Price', flex: 0.5, valueFormatter: (params) => `$${params.value}` },
    { field: 'stock_quantity', headerName: 'Stock', flex: 0.5 },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            variant="outlined" 
            color="primary" 
            size="small"
            onClick={() => handleViewDetails(params.row)}
          >
            View
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            size="small"
            onClick={() => handleEditClick(params.row)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => handleDeleteProduct(params.row.id)}
          >
            Delete
          </Button>
          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<QrCodeIcon fontSize="small" />}
            onClick={() => handleGenerateBarcode(params.row)}
          >
            QR
          </Button>
        </div>
      ),
    },
  ];

  // Modify the renderCreateForm to use the checkboxComponent
  const renderCreateForm = () => {
    // Use the determined checkbox component or fallback to a basic input
    const CheckboxToUse = checkboxComponent || FallbackCheckbox;
    
    // Fix for input fields
    const commonTextFieldProps = {
      autoComplete: "off",
      variant: "outlined",
      InputProps: {
        sx: { 
          '&.Mui-focused': { zIndex: 99999 },
          '&:hover': { zIndex: 99999 }
        }
      },
      onFocus: (e) => e.target.select() // Helps with selecting text on focus
    };
    
    return (
      <div>
        <Typography variant="h5" component="h1" gutterBottom>
          {isEditing ? 'Edit Product' : 'Create New Product'}
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
          {isEditing ? (
            // Edit form with MUI components
            <form className="product-form" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Product Name"
                    name="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Price"
                    name="price"
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    InputProps={{
                      ...commonTextFieldProps.InputProps,
                      startAdornment: <span>$</span>,
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Description"
                    name="description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    multiline
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Stock Quantity"
                    name="stock_quantity"
                    type="number"
                    value={editStockQuantity}
                    onChange={(e) => setEditStockQuantity(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Reorder Level"
                    name="reorder_level"
                    type="number"
                    value={editReorderLevel}
                    onChange={(e) => setEditReorderLevel(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedProduct(null);
                    }}
                    sx={{ ml: 2 }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            // Create form using MUI components
            <form className="product-form" onSubmit={handleCreateProduct}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    required
                    label="Product Name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter product name"
                  />
                </div>
                
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    required
                    label="Price"
                    name="price"
                    type="number"
                    inputProps={{ step: "0.01", min: "0" }}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Stock Quantity"
                    name="stock_quantity"
                    type="number"
                    inputProps={{ step: "1", min: "0" }}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Description"
                    name="description"
                    multiline
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter product description"
                  />
                </div>
                
                <div className="col-span-2">
                  <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                    <Typography variant="body1" className="font-medium mb-2">Availability</Typography>
                    <FormGroup row>
                      <FormControlLabel
                        control={
                          <CheckboxToUse
                            checked={forSale}
                            onChange={(e) => setForSale(e.target.checked)}
                            name="for_sale"
                          />
                        }
                        label="Available for Sale"
                      />
                      <FormControlLabel
                        control={
                          <CheckboxToUse
                            checked={forRent}
                            onChange={(e) => setForRent(e.target.checked)}
                            name="for_rent"
                          />
                        }
                        label="Available for Rent"
                      />
                    </FormGroup>
                  </FormControl>
                </div>
                
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Reorder Level"
                    name="reorder_level"
                    type="number"
                    inputProps={{ min: "0" }}
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-2">
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Product'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Paper>
        
        {/* Success Dialog */}
        <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
          <DialogTitle>Product Created Successfully</DialogTitle>
          <DialogContent>
            <Typography>Your product has been created successfully!</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Would you like to print a barcode for this product?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuccessDialogOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                setSuccessDialogOpen(false);
                // Get the product details and open barcode dialog
                const createdProduct = products.find(p => p.id === createdProductId);
                if (createdProduct) {
                  setCurrentBarcodeProduct(createdProduct);
                  setBarcodeDialogOpen(true);
                }
              }}
              startIcon={<QrCodeIcon fontSize="small" />}
            >
              Generate Barcode
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  };

  // Render the product details view
  const renderProductDetails = () => {
    if (!selectedProduct) {
      return (
        <Paper elevation={3} sx={{ p: 3, mt: 2, textAlign: 'center' }}>
          <Typography>Please select a product to view details</Typography>
        </Paper>
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
      >
        <div className="statusBar">
          <div>
            <Typography variant="h5" gutterBottom>
              {selectedProduct.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedProduct.description || 'No description available'}
            </Typography>
          </div>
          
          <div>
            <span className={`statusTag ${selectedProduct.stock_quantity > 0 ? 'active' : 'inactive'}`}>
              {selectedProduct.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Price</Typography>
            <Typography variant="body1">${selectedProduct.price}</Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Stock Quantity</Typography>
            <Typography variant="body1">{selectedProduct.stock_quantity}</Typography>
          </div>
          
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Reorder Level</Typography>
            <Typography variant="body1">{selectedProduct.reorder_level || 'Not set'}</Typography>
          </div>
          <div className="col-span-2">
            <Typography variant="subtitle2" color="textSecondary">Available for</Typography>
            <Typography variant="body1">
              {[
                selectedProduct.for_sale && 'Sale',
                selectedProduct.for_rent && 'Rent'
              ].filter(Boolean).join(', ') || 'Not available'}
            </Typography>
          </div>
        </div>
        
        <div className="formActions">
          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleEditClick(selectedProduct)}
          >
            Edit Product
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<QrCodeIcon fontSize="small" />}
            onClick={() => handleGenerateBarcode(selectedProduct)}
          >
            Generate Barcode
          </Button>
        </div>
      </ModernFormLayout>
    );
  };

  // Render the products list
  const renderProductsList = () => {
    return (
      <div>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Products List
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              setIsEditing(false);
              setActiveTab(0);
            }}
          >
            + Create New Product
          </Button>
        </Box>
        
        <Paper elevation={3} sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={products}
            columns={dataGridColumns}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 25]}
            disableSelectionOnClick
            loading={isLoading}
          />
        </Paper>
      </div>
    );
  };

  // Barcode Dialog
  const renderBarcodeDialog = () => {
    return (
      <Dialog 
        open={isBarcodeDialogOpen} 
        onClose={() => setBarcodeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Product QR Code</DialogTitle>
        <DialogContent>
          {currentBarcodeProduct && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {currentBarcodeProduct.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Code: {currentBarcodeProduct.product_code}
              </Typography>
              
              <Box sx={{ my: 3 }}>
                <BarcodeGenerator 
                  value={currentBarcodeProduct.product_code || currentBarcodeProduct.id.toString()}
                  size={200}
                  productInfo={{
                    name: currentBarcodeProduct.name,
                    price: `$${currentBarcodeProduct.price}`,
                    id: currentBarcodeProduct.id
                  }}
                />
              </Box>
              
              <Typography variant="body2">
                Scan this code to quickly access this product.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBarcodeDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              // This would be connected to a print function
              window.print();
            }}
          >
            Print Barcode
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ width: '100%', pt: 3 }}>
      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label={isEditing ? "Edit Product" : "Create Product"} />
          <Tab label="Product Details" disabled={!selectedProduct} />
          <Tab label="Products List" />
        </Tabs>
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderCreateForm()}
        {activeTab === 1 && renderProductDetails()}
        {activeTab === 2 && renderProductsList()}
      </Box>
      
      {/* Barcode Dialog */}
      {renderBarcodeDialog()}
    </Box>
  );
};

ProductManagement.propTypes = {
  isNewProduct: PropTypes.bool,
  newProduct: PropTypes.bool, // For backward compatibility
  product: PropTypes.object,
  onUpdate: PropTypes.func,
  onCancel: PropTypes.func
};

export default ProductManagement;