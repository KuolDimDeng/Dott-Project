import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Menu, MenuItem } from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';


const ProductManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    sellEnabled: false,
    buyEnabled: false,
    salesTax: 0,
    stock_quantity: 0,
    reorder_level: 0,
  });
  const { addMessage } = useUserMessageContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);


  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/api/products/');
      setProducts(response.data);
    } catch (error) {
      logger.error('Error fetching products', error);
      addMessage('error', 'Error fetching products');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value, checked, type } = event.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/create-product/', newProduct);
      addMessage('success', 'Product created successfully');
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        sellEnabled: false,
        buyEnabled: false,
        salesTax: 0,
        stock_quantity: 0,
        reorder_level: 0,
      });
      fetchProducts();
    } catch (error) {
      logger.error('Error creating product', error);
      addMessage('error', 'Error creating product');
    }
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
    try {
      const response = await axiosInstance.patch(`/api/products/${selectedProduct.id}/`, editedProduct);
      setSelectedProduct(response.data);
      setIsEditing(false);
      fetchProducts();
      addMessage('success', 'Product updated successfully');
    } catch (error) {
      logger.error('Error updating product', error);
      addMessage('error', 'Error updating product');
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/products/${selectedProduct.id}/`);
      addMessage('success', 'Product deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      setActiveTab(2);
    } catch (error) {
      logger.error('Error deleting product', error);
      addMessage('error', 'Error deleting product');
    }
  };

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = (format) => {
    // Implement export logic here
    console.log(`Exporting to ${format}`);
    handleExportClose();
  };

  const buttonStyle = {
    color: '#000080', // Navy blue
    borderColor: '#000080',
    '&:hover': {
      backgroundColor: '#000080',
      color: 'white',
    },
  };


  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Product Management
      </Typography>
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab label="Create" />
        <Tab label="Details" />
        <Tab label="List" />
      </Tabs>

      {activeTab === 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>Create Product</Typography>
          <form onSubmit={handleCreateProduct}>
            <TextField label="Name" name="name" value={newProduct.name} onChange={handleInputChange} fullWidth margin="normal" required />
            <TextField label="Description" name="description" value={newProduct.description} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Price" name="price" type="number" value={newProduct.price} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Sales Tax" name="salesTax" type="number" value={newProduct.salesTax} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Stock Quantity" name="stock_quantity" type="number" value={newProduct.stock_quantity} onChange={handleInputChange} fullWidth margin="normal" />
            <TextField label="Reorder Level" name="reorder_level" type="number" value={newProduct.reorder_level} onChange={handleInputChange} fullWidth margin="normal" />
            <Button type="submit" variant="contained" color="primary">Create Product</Button>
          </form>
        </Box>
      )}

      {activeTab === 1 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>Product Details</Typography>
          {selectedProduct ? (
            <Box>
              <TextField label="Name" name="name" value={isEditing ? editedProduct.name : selectedProduct.name} onChange={handleInputChange} fullWidth margin="normal" required disabled={!isEditing} />
              <TextField label="Description" name="description" value={isEditing ? editedProduct.description : selectedProduct.description} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Price" name="price" type="number" value={isEditing ? editedProduct.price : selectedProduct.price} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Sales Tax" name="salesTax" type="number" value={isEditing ? editedProduct.salesTax : selectedProduct.salesTax} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Stock Quantity" name="stock_quantity" type="number" value={isEditing ? editedProduct.stock_quantity : selectedProduct.stock_quantity} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              <TextField label="Reorder Level" name="reorder_level" type="number" value={isEditing ? editedProduct.reorder_level : selectedProduct.reorder_level} onChange={handleInputChange} fullWidth margin="normal" disabled={!isEditing} />
              {isEditing ? (
                <Box mt={2}>
                  <Button variant="contained" color="primary" onClick={handleSaveEdit}>Save</Button>
                  <Button variant="contained" color="secondary" onClick={handleCancelEdit}>Cancel</Button>
                </Box>
              ) : (
                <Box mt={2}>
                  <Button variant="contained" color="primary" onClick={handleEdit}>Edit</Button>
                  <Button variant="contained" color="secondary" onClick={handleDelete}>Delete</Button>
                </Box>
              )}
            </Box>
          ) : (
            <Typography>Select a product from the list to view details</Typography>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Product List</Typography>

            <Button
              variant="outlined"
              onClick={handleExportClick}
              endIcon={<ArrowDropDownIcon />}
              sx={buttonStyle}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={handleExportClose}
            >
              <MenuItem onClick={() => handleExport('PDF')}>PDF</MenuItem>
              <MenuItem onClick={() => handleExport('CSV')}>CSV</MenuItem>
              <MenuItem onClick={() => handleExport('Excel')}>Excel</MenuItem>
            </Menu>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} onClick={() => handleProductSelect(product)}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.price}</TableCell>
                    <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this product?
            <br />
            Name: {selectedProduct?.name}
            <br />
            Description: {selectedProduct?.description}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductManagement;
