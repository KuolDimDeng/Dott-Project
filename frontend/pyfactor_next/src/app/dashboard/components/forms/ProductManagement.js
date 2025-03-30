'use client';
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import BarcodeGenerator from '@/components/BarcodeGenerator';

// Custom QR code icon using SVG
const QrCodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
    <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
  </svg>
);
import { useTable, usePagination, useSortBy } from 'react-table';
import { axiosInstance } from '@/lib/axiosConfig';
import PropTypes from 'prop-types';
import { useNotification } from '@/context/NotificationContext';

// Modern Form Layout component using Tailwind classes
const ModernFormLayout = ({ children, title, subtitle, onSubmit, isLoading, submitLabel }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col gap-4 p-6">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-xl font-semibold m-0">{title}</h3>}
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

// Tailwind checkbox component
const TailwindCheckbox = ({ checked, onChange, name, label }) => {
  return (
    <div className="flex items-center">
      <input
        id={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        name={name}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label && (
        <label htmlFor={name} className="ml-2 text-sm text-gray-700">
          {label}
        </label>
      )}
    </div>
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

  // Use Tailwind checkbox component
  const checkboxComponent = TailwindCheckbox;

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

  // Render the products list using react-table and Tailwind
  const renderProductsList = () => {
    const columns = React.useMemo(
      () => [
        {
          Header: 'Code',
          accessor: row => row.product_code || row.productCode || `P-${row.id}`,
          id: 'product_code',
        },
        {
          Header: 'Name',
          accessor: row => row.name || 'Unnamed Product',
          id: 'name',
        },
        {
          Header: 'Price',
          accessor: 'price',
          Cell: ({ value }) => `$${value || 0}`,
        },
        {
          Header: 'Stock',
          accessor: row => row.stock_quantity || row.stockQuantity || 0,
          id: 'stock_quantity',
        },
        {
          Header: 'Actions',
          id: 'actions',
          Cell: ({ row }) => (
            <div className="flex space-x-2">
              <button 
                className="px-2 py-1 text-xs font-medium rounded border border-blue-700 text-blue-700 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(row.original);
                }}
              >
                View
              </button>
              <button 
                className="px-2 py-1 text-xs font-medium rounded border border-purple-700 text-purple-700 hover:bg-purple-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(row.original);
                }}
              >
                Edit
              </button>
              <button 
                className="px-2 py-1 text-xs font-medium rounded border border-red-700 text-red-700 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProduct(row.original.id);
                }}
              >
                Delete
              </button>
              <button 
                className="px-2 py-1 text-xs font-medium rounded border border-green-700 text-green-700 hover:bg-green-50 flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateBarcode(row.original);
                }}
              >
                <span className="mr-1">QR</span>
              </button>
            </div>
          ),
        },
      ],
      []
    );

    const data = React.useMemo(() => products || [], [products]);
    
    const {
      getTableProps,
      getTableBodyProps,
      headerGroups,
      page,
      prepareRow,
      canPreviousPage,
      canNextPage,
      pageOptions,
      pageCount,
      gotoPage,
      nextPage,
      previousPage,
      setPageSize,
      state: { pageIndex, pageSize },
    } = useTable(
      { 
        columns, 
        data,
        initialState: { pageIndex: 0, pageSize: 10 },
      },
      useSortBy,
      usePagination
    );

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Products List
          </h2>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => {
              setIsEditing(false);
              setActiveTab(0);
            }}
          >
            + Create New Product
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {headerGroups.map(headerGroup => (
                      <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (
                          <th
                            {...column.getHeaderProps(column.getSortByToggleProps())}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column.render('Header')}
                            <span>
                              {column.isSorted
                                ? column.isSortedDesc
                                  ? ' ▼'
                                  : ' ▲'
                                : ''}
                            </span>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody
                    {...getTableBodyProps()}
                    className="bg-white divide-y divide-gray-200"
                  >
                    {page.map((row, i) => {
                      prepareRow(row);
                      return (
                        <tr
                          {...row.getRowProps()}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedProduct(row.original)}
                        >
                          {row.cells.map(cell => {
                            return (
                              <td
                                {...cell.getCellProps()}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                              >
                                {cell.render('Cell')}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => previousPage()}
                    disabled={!canPreviousPage}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      !canPreviousPage ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      !canNextPage ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{pageIndex * pageSize + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min((pageIndex + 1) * pageSize, data.length)}
                      </span>{' '}
                      of <span className="font-medium">{data.length}</span> products
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => gotoPage(0)}
                        disabled={!canPreviousPage}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          !canPreviousPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">First</span>
                        {'<<'}
                      </button>
                      <button
                        onClick={() => previousPage()}
                        disabled={!canPreviousPage}
                        className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                          !canPreviousPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        {'<'}
                      </button>
                      <button
                        onClick={() => nextPage()}
                        disabled={!canNextPage}
                        className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                          !canNextPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        {'>'}
                      </button>
                      <button
                        onClick={() => gotoPage(pageCount - 1)}
                        disabled={!canNextPage}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          !canNextPage ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Last</span>
                        {'>>'}
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Barcode Dialog with Headless UI
  const renderBarcodeDialog = () => {
    return (
      <Transition.Root show={isBarcodeDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setBarcodeDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  {/* Header */}
                  <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
                    <div className="flex items-center">
                      <QrCodeIcon />
                      <Dialog.Title as="h3" className="ml-2 text-base font-semibold leading-6 text-gray-900">
                        Product QR Code
                      </Dialog.Title>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="px-4 py-5 sm:px-6">
                    {currentBarcodeProduct && (
                      <div className="print-container">
                        <div className="text-center">
                          <h3 className="text-lg font-bold mb-1">
                            {currentBarcodeProduct.name}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            Code: {currentBarcodeProduct.product_code}
                          </p>
                          
                          {currentBarcodeProduct.description && (
                            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                              {currentBarcodeProduct.description}
                            </p>
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
                          <div>
                            <p className="text-xs text-gray-500">Price</p>
                            <p className="font-medium">${currentBarcodeProduct.price}</p>
                          </div>
                          {currentBarcodeProduct.stock_quantity !== undefined && (
                            <div>
                              <p className="text-xs text-gray-500">Stock</p>
                              <p className="font-medium">{currentBarcodeProduct.stock_quantity}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="print-instructions mt-6 border-t border-gray-200 pt-4">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Scan Instructions:</span> Scan this code with any QR reader to quickly access product information for inventory management.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
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
                      <span role="img" aria-label="print" className="mr-1">🖨️</span>
                      Print QR Code
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                      onClick={() => setBarcodeDialogOpen(false)}
                    >
                      Close
                    </button>
                    <p className="text-xs text-gray-500 mr-auto hidden-print mt-2 sm:mt-0 sm:flex sm:items-center">
                      Click Print to save or print this QR code
                    </p>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    );
  };

  return (
    <div className="w-full pt-6">
      <div className="bg-white rounded-lg shadow-sm w-full overflow-hidden">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={(e) => handleTabChange(e, 0)}
            >
              {isEditing ? "Edit Product" : "Create Product"}
            </button>
            <button
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                !selectedProduct
                  ? 'text-gray-400 border-transparent cursor-not-allowed'
                  : activeTab === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={(e) => selectedProduct && handleTabChange(e, 1)}
              disabled={!selectedProduct}
            >
              Product Details
            </button>
            <button
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 2
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={(e) => handleTabChange(e, 2)}
            >
              Products List
            </button>
          </nav>
        </div>
      </div>
      
      <div className="mt-6">
        {activeTab === 0 && renderCreateForm()}
        {activeTab === 1 && renderProductDetails()}
        {activeTab === 2 && renderProductsList()}
      </div>
      
      {/* Barcode Dialog */}
      {renderBarcodeDialog()}
    </div>
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