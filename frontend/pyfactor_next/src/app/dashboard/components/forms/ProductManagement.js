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
import { useNotification } from '@/context/NotificationContext';

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

  // Add print styles for QR code
  useEffect(() => {
    // Create a style element for print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        body.printing-qr-code .MuiDialog-root * {
          visibility: hidden;
        }
        body.printing-qr-code .print-container,
        body.printing-qr-code .print-container * {
          visibility: visible;
        }
        body.printing-qr-code .hidden-print {
          display: none !important;
        }
        body.printing-qr-code .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          padding: 15mm;
        }
        body.printing-qr-code .qr-code-container {
          page-break-inside: avoid;
          margin: 0 auto;
          width: fit-content;
        }
        body.printing-qr-code .print-details {
          margin-top: 15mm;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Clean up
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  // Get notification functions
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } = useNotification();

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
      console.log('Fetching products from tenant schema...');
      const response = await axiosInstance.get('/api/inventory/products/');
      
      // Log the response for debugging
      console.log('Products fetched:', response.data);
      
      let parsedProducts = [];
      
      if (!response.data) {
        console.warn('Empty response data received from API');
      } else if (Array.isArray(response.data)) {
        parsedProducts = response.data;
      } else if (typeof response.data === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsedData = JSON.parse(response.data);
          parsedProducts = Array.isArray(parsedData) ? parsedData : 
            (parsedData && typeof parsedData === 'object' ? [parsedData] : []);
        } catch (parseError) {
          console.error('Error parsing product data:', parseError);
          notifyError('Error parsing product data');
        }
      } else if (typeof response.data === 'object') {
        // Single product object
        parsedProducts = [response.data];
      }
      
      console.log('Parsed products:', parsedProducts);
      setProducts(parsedProducts);
    } catch (error) {
      notifyError('Failed to fetch products');
      console.error('Error fetching products:', error);
      setProducts([]);
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
    
    // Validate required fields
    if (!name.trim()) {
      notifyError('Product name is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare data to submit
      const productData = {
        name: name.trim(),
        description,
        price: price || 0,
        for_sale: forSale,
        for_rent: forRent,
        stock_quantity: stockQuantity || 0,
        reorder_level: reorderLevel || 0,
        product_code: `P-${Date.now().toString().slice(-6)}` // Generate a simple product code if not provided
      };
      
      console.log('Creating product with data:', productData);
      const response = await axiosInstance.post('/api/inventory/products/', productData);
      
      // Log the created product
      console.log('Product created successfully:', response.data);
      
      // Parse response data if needed
      let createdProduct;
      if (typeof response.data === 'string') {
        try {
          createdProduct = JSON.parse(response.data);
        } catch (e) {
          console.warn('Could not parse product response as JSON', e);
          createdProduct = response.data;
        }
      } else {
        createdProduct = response.data;
      }
      
      // Show success notification
      notifySuccess(`Product "${productData.name}" created successfully`);
      
      // Set the newly created product for possible barcode generation
      setCreatedProductId(createdProduct.id);
      setCurrentBarcodeProduct(createdProduct);
      
      // Show success dialog with option to print barcode
      setSuccessDialogOpen(true);
      
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setForSale(true);
      setForRent(false);
      setStockQuantity('');
      setReorderLevel('');
      
      // Refresh product list after creation
      await fetchProducts();
      
      // Switch to the list tab to show the newly created product
      setActiveTab(2);
      
    } catch (error) {
      notifyError(error.response?.data?.message || 'Error creating product');
      console.error('Error creating product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedProduct) return;
    
    setIsSubmitting(true);
    try {
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
      
      const response = await axiosInstance.patch(`/api/inventory/products/${editedProduct.id}/`, updatedProduct);
      
      // Update local state with the updated product
      setProducts(products.map(p => p.id === editedProduct.id ? response.data : p));
      setIsEditing(false);
      setEditedProduct(null);
      
      notifySuccess('Product updated successfully');
      
    } catch (error) {
      notifyError(error.response?.data?.message || 'Error updating product');
      console.error('Error updating product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await axiosInstance.delete(`/api/inventory/products/${id}/`);
      
      // Remove the deleted product from the list
      setProducts(products.filter(p => p.id !== id));
      
      notifySuccess('Product deleted successfully');
      
    } catch (error) {
      notifyError(error.response?.data?.message || 'Error deleting product');
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
    { 
      field: 'product_code', 
      headerName: 'Code', 
      flex: 0.5,
      valueGetter: (params) => {
        if (!params || !params.row) return '';
        return params.row.product_code || params.row.productCode || `P-${params.row.id}`;
      },
    },
    { 
      field: 'name', 
      headerName: 'Name', 
      flex: 1,
      valueGetter: (params) => {
        if (!params || !params.row) return '';
        return params.row.name || 'Unnamed Product';
      },
    },
    { 
      field: 'price', 
      headerName: 'Price', 
      flex: 0.5, 
      valueFormatter: (params) => {
        if (!params || params.value === undefined) return '$0';
        return `$${params.value || 0}`;
      }
    },
    { 
      field: 'stock_quantity', 
      headerName: 'Stock', 
      flex: 0.5,
      valueGetter: (params) => {
        if (!params || !params.row) return 0;
        return params.row.stock_quantity || params.row.stockQuantity || 0;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => {
        if (!params || !params.row) return null;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(params.row);
              }}
            >
              View
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(params.row);
              }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteProduct(params.row.id);
              }}
            >
              Delete
            </Button>
            <Button
              variant="outlined"
              color="info"
              size="small"
              startIcon={<QrCodeIcon fontSize="small" />}
              onClick={(e) => {
                e.stopPropagation(); 
                handleGenerateBarcode(params.row);
              }}
            >
              QR
            </Button>
          </div>
        );
      },
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
      inputProps: {
        sx: { 
          '&.Mui-focused': { zIndex: 99999 },
          '&:hover': { zIndex: 99999 }
        }
      },
      onFocus: (e) => e.target.select() // Helps with selecting text on focus
    };
    
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 border-b border-gray-200 pb-4">
          <Typography variant="h4" component="h1" className="font-bold text-gray-800">
            {isEditing ? 'Edit Product' : 'Create New Product'}
          </Typography>
          <Typography variant="body1" className="text-gray-500 mt-1">
            {isEditing ? 'Update the product information below.' : 'Fill in the details to add a new product to your inventory.'}
          </Typography>
          {!isEditing && (
            <Alert severity="info" className="mt-4">
              After creating a product, you'll be able to print a QR code for inventory management.
            </Alert>
          )}
        </div>
        
        <Paper elevation={3} className="rounded-lg overflow-hidden shadow-lg">
          {isEditing ? (
            // Edit form with MUI components
            <form className="product-form p-6" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="mb-0"
                  />
                </div>
                <div className="col-span-1">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Price"
                    name="price"
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    inputProps={{
                      ...commonTextFieldProps.inputProps,
                      startAdornment: <span>$</span>,
                    }}
                    className="mb-0"
                  />
                </div>
                <div className="col-span-1">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Stock Quantity"
                    name="stock_quantity"
                    type="number"
                    value={editStockQuantity}
                    onChange={(e) => setEditStockQuantity(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mb-0"
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
                    multiline="true"
                    rows={3}
                    className="mb-0"
                  />
                </div>
                <div className="col-span-1">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Reorder Level"
                    name="reorder_level"
                    type="number"
                    value={editReorderLevel}
                    onChange={(e) => setEditReorderLevel(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mb-0"
                  />
                </div>
                <div className="col-span-1">
                  <FormControl component="fieldset" fullWidth className="mb-0">
                    <Typography variant="body1" className="font-medium mb-2">Availability</Typography>
                    <FormGroup row className="space-x-4">
                      <FormControlLabel
                        control={
                          <CheckboxToUse
                            checked={editForSale}
                            onChange={(e) => setEditForSale(e.target.checked)}
                            name="for_sale"
                          />
                        }
                        label="For Sale"
                      />
                      <FormControlLabel
                        control={
                          <CheckboxToUse
                            checked={editForRent}
                            onChange={(e) => setEditForRent(e.target.checked)}
                            name="for_rent"
                          />
                        }
                        label="For Rent"
                      />
                    </FormGroup>
                  </FormControl>
                </div>
                <div className="col-span-2 mt-4 flex justify-end space-x-4">
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedProduct(null);
                    }}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            // Create form using MUI components
            <form className="product-form p-6" onSubmit={handleCreateProduct}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="mb-0"
                  />
                </div>
                
                <div className="col-span-1">
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
                    className="mb-0"
                  />
                </div>
                
                <div className="col-span-1">
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
                    className="mb-0"
                  />
                </div>
                
                <div className="col-span-2">
                  <TextField
                    {...commonTextFieldProps}
                    fullWidth
                    label="Description"
                    name="description"
                    multiline="true"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter product description"
                    className="mb-0"
                  />
                </div>
                
                <div className="col-span-1">
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
                    className="mb-0"
                  />
                </div>
                
                <div className="col-span-1">
                  <FormControl component="fieldset" fullWidth className="mb-0">
                    <Typography variant="body1" className="font-medium mb-2">Availability Options</Typography>
                    <FormGroup row className="space-x-4">
                      <FormControlLabel
                        control={
                          <CheckboxToUse
                            checked={forSale}
                            onChange={(e) => setForSale(e.target.checked)}
                            name="for_sale"
                          />
                        }
                        label="For Sale"
                      />
                      <FormControlLabel
                        control={
                          <CheckboxToUse
                            checked={forRent}
                            onChange={(e) => setForRent(e.target.checked)}
                            name="for_rent"
                          />
                        }
                        label="For Rent"
                      />
                    </FormGroup>
                  </FormControl>
                </div>
                
                <div className="col-span-2 mt-4 flex justify-end">
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={isSubmitting}
                    className="px-8 py-3"
                  >
                    {isSubmitting ? 
                      <div className="flex items-center">
                        <CircularProgress size="small" color="inherit" className="mr-2" />
                        Creating...
                      </div> : 
                      'Create Product'
                    }
                  </Button>
                </div>
                
                {/* QR Code Information Section */}
                <div className="col-span-2 mt-8 pt-6 border-t border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="mb-4 md:mb-0 md:mr-6">
                      <Typography variant="h6" className="font-medium mb-2">
                        Inventory QR Code
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Print QR codes for your products to streamline inventory management.
                        Scan codes with any QR reader for quick product identification and tracking.
                      </Typography>
                      <Typography variant="body2" className="text-gray-500 mt-2 italic">
                        Create your product first to enable QR code generation.
                      </Typography>
                    </div>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<QrCodeIcon fontSize="small" />}
                      disabled={true}
                      className="whitespace-nowrap px-6 py-2 opacity-50"
                    >
                      Generate QR Code
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </Paper>
        
        {/* Success Dialog */}
        <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
          <DialogTitle className="border-b pb-2">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Product Created Successfully
            </div>
          </DialogTitle>
          <DialogContent className="pt-4">
            <Typography variant="h6" className="mb-2">Your product has been created successfully!</Typography>
            <Typography variant="body1" className="mb-4">
              Your product is now saved in the inventory system and can be managed from the Products List.
            </Typography>
            <Alert severity="info" className="mb-2">
              <div className="flex items-center">
                <QrCodeIcon className="mr-2" />
                <Typography variant="body1" className="font-medium">
                  Print QR Code for Inventory Management
                </Typography>
              </div>
              <Typography variant="body2" className="mt-1">
                You can now generate and print a QR code label for this product to streamline your inventory management.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions className="border-t p-3">
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
              className="px-6"
            >
              Generate QR Code
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
            Generate QR Code
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
            rows={products || []}
            columns={dataGridColumns}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 25]}
            disableSelectionOnClick
            loading={isLoading}
            getRowId={(row) => {
              if (!row) return Math.random().toString(36).substr(2, 9);
              return row.id?.toString() || row._id?.toString() || Math.random().toString(36).substr(2, 9);
            }}
            sx={{ 
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                cursor: 'pointer'
              }
            }}
            onRowClick={(params) => {
              if (!params || !params.row) return;
              console.log('Row clicked:', params.row);
              setSelectedProduct(params.row);
            }}
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
        <DialogTitle className="border-b pb-2">
          <div className="flex items-center">
            <QrCodeIcon className="mr-2" />
            Product QR Code
          </div>
        </DialogTitle>
        <DialogContent>
          {currentBarcodeProduct && (
            <Box sx={{ p: 3 }} className="print-container">
              <div className="text-center">
                <Typography variant="h5" className="font-bold mb-1">
                  {currentBarcodeProduct.name}
                </Typography>
                <Typography variant="body1" color="textSecondary" className="mb-2">
                  Code: {currentBarcodeProduct.product_code}
                </Typography>
                
                {currentBarcodeProduct.description && (
                  <Typography variant="body2" color="textSecondary" className="mb-4 max-w-md mx-auto">
                    {currentBarcodeProduct.description}
                  </Typography>
                )}
              </div>
              
              <div className="flex justify-center my-6">
                <div className="qr-code-container p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <BarcodeGenerator 
                    value={currentBarcodeProduct.product_code || currentBarcodeProduct.id.toString()}
                    size={250}
                    productInfo={{
                      name: currentBarcodeProduct.name,
                      price: `$${currentBarcodeProduct.price}`,
                      id: currentBarcodeProduct.id
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 print-details">
                <div className="col-span-1">
                  <Typography variant="subtitle2" className="text-gray-500">Price</Typography>
                  <Typography variant="body1" className="font-medium">${currentBarcodeProduct.price}</Typography>
                </div>
                {currentBarcodeProduct.stock_quantity !== undefined && (
                  <div className="col-span-1">
                    <Typography variant="subtitle2" className="text-gray-500">Stock</Typography>
                    <Typography variant="body1" className="font-medium">{currentBarcodeProduct.stock_quantity}</Typography>
                  </div>
                )}
              </div>
              
              <div className="print-instructions mt-6 border-t border-gray-200 pt-4">
                <Typography variant="body2" className="text-gray-600">
                  <span className="font-medium">Scan Instructions:</span> Scan this code with any QR reader to quickly access product information for inventory management.
                </Typography>
              </div>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="border-t p-3">
          <Typography variant="body2" color="textSecondary" className="mr-auto hidden-print">
            Click Print to save or print this QR code
          </Typography>
          <Button onClick={() => setBarcodeDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<span role="img" aria-label="print">🖨️</span>}
            onClick={() => {
              // Add a class to body for print styling
              document.body.classList.add('printing-qr-code');
              // Print using browser print
              window.print();
              // Remove class after printing
              setTimeout(() => {
                document.body.classList.remove('printing-qr-code');
              }, 1000);
            }}
          >
            Print QR Code
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